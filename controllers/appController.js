import UserModel from '../model/User.model.js';
import bcrypt from 'bcrypt';
import pkg from 'jsonwebtoken';
import ENV from '../config.js';
import otpGenerator from 'otp-generator';


// middleware for verify user
export async function verifyUser(req, res, next) {

    try {
        const { username } = req.method == "GET" ? req.query : req.body;

        //check the user existance
        let exist = await UserModel.findOne({ username })
        if (!exist) return res.status(404).send({ error: "Can't find user" })
        next();
    } catch (error) {
        return res.status(404).send({ error: "Authentication failed" })
    }

}

// post router------------------------
export async function register(req, res) {

    try {
        const { username, password, profile, email, address } = req.body;
        const { jwt } = pkg;

        // check the existing user
        const existUsername = new Promise((resolve, reject) => {
            UserModel.findOne({ username }, function (err, user) {
                if (err) reject(new Error(err))
                if (user) reject({ error: "Please use unique username" })

                resolve()
            })
        })

        // check existing email
        const existEmail = new Promise((resolve, reject) => {
            UserModel.findOne({ email }, function (err, email) {
                if (err) reject(new Error(err))
                if (email) reject({ error: "Please use unique email" })

                resolve()
            })
        })

        Promise.all([existUsername, existEmail])
            .then(() => {
                if (password) {
                    bcrypt.hash(password, 10)
                        .then(hashedPassword => {
                            const user = new UserModel({
                                username,
                                password: hashedPassword,
                                profile: profile || '',
                                email
                            });

                            // return save result as a response
                            user.save()
                                .then(result => res.status(201).send({ msg: "User Register Successful" }))
                                .catch(error => res.status(500).send({ error }))
                        }).catch(error => {
                            return res.status(500).send({
                                error: "Enable to hashed password"
                            })
                        })
                }
            }).catch(error => {
                return res.status(500).send({ error })
            })

    } catch (error) {
        return res.status(500).send({ error })
    }
}
// -----------------------------------------------

// export async function register(req, res) {

//     try {
//         const { username, password, profile, email } = req.body;

//         // check the existing user
//         const existUsername = new Promise((resolve, reject) => {
//             UserModel.findOne({ username }, function (err, user) {
//                 if (err) reject(new Error(err))
//                 if (user) reject({ error: "Please use unique username" });

//                 resolve();
//             })
//         });

//         // check for existing email
//         const existEmail = new Promise((resolve, reject) => {
//             UserModel.findOne({ email }, function (err, email) {
//                 if (err) reject(new Error(err))
//                 if (email) reject({ error: "Please use unique Email" });

//                 resolve();
//             })
//         });


//         Promise.all([existUsername, existEmail])
//             .then(() => {
//                 if (password) {
//                     bcrypt.hash(password, 10)
//                         .then(hashedPassword => {

//                             const user = new UserModel({
//                                 username,
//                                 password: hashedPassword,
//                                 profile: profile || '',
//                                 email
//                             });

//                             // return save result as a response
//                             user.save()
//                                 .then(result => res.status(201).send({ msg: "User Register Successfully" }))
//                                 .catch(error => res.status(500).send({ error }))

//                         }).catch(error => {
//                             return res.status(500).send({
//                                 error: "Enable to hashed password"
//                             })
//                         })
//                 }
//             }).catch(error => {
//                 return res.status(500).send({ error })
//             })


//     } catch (error) {
//         return res.status(500).send(error);
//     }

// }


// post login route
export async function login(req, res) {
    const { username, password } = req.body;
    try {
        UserModel.findOne({ username })
            .then(user => {
                bcrypt.compare(password, user.password)
                    .then(passwordCheck => {
                        if (!passwordCheck) return res.status(400).send({ error: "Password doesnot match" })
                    })
                    .catch(error => {
                        return res.status(400).send({ error: "Password doesnot match" })

                        //create jwt token
                        const token = jwt.sign({
                            userId: user._id,
                            username: user.username
                        }, ENV.JWT_SECRET, { expiresIn: "24h" });

                        return res.status(200).send({
                            msg: "Login Successful",
                            username: user.username,
                            token
                        })
                    })

            })
            .catch(error => {
                return res.status(404).send({ error: "Username not found" })
            })

    } catch (error) {
        return res.status(500).send({ error })
    }

}

// get
export async function getUser(req, res) {
    const { username } = req.params;
    try {
        if (!username) return res.status(501).send({ error: "Invalid username" })
        UserModel.findOne({ username }, function (err, user) {
            if (err) return res.status(500).send({ err })
            if (!user) return res.status(501).send("Couldn't find user")

            const { password, ...rest } = Object.assign({}, user.toJSON());

            return res.status(201).send(rest)
        })

    } catch (error) {
        return res.status(404).send({ error: "Cannot find user data" })
    }
}

// put
export async function updateUser(req, res) {
    try {
        // const id= req.query.id;
        const { userId } = req.user;

        if (userId) {
            const body = req.body;

            // update the data
            UserModel.updateOne({ _id: userId }, body, function (err, data) {
                if (err) throw err;

                return res.status(201).send({ msg: "Updated successfully" })
            })

        } else {
            return res.status(401).send({ error: "User not found" })
        }

    } catch (error) {
        return res.status(401).send({ error })
    }
}

// get
export async function generateOTP(req, res) {
    req.app.locals.OTP = await otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false })
    res.status(201).send({ code: req.app.locals.OTP })
}

// get
export async function verifyOTP(req, res) {
    const { code } = req.query
    if (parseInt(req.app.locals.OTP) === parseInt(code)) {
        req.app.locals.OTP = null
        req.app.locals.resetSession = true
        return res.status(201).send({ msg: "Verify successfully" })
    }
    return res.status(401).send({ error: "Invalid OTP" })
}

// get
export async function createResetSession(req, res) {
    if (req.app.locals.resetSession) {
        req.app.locals.resetPassword = false //allow access to this route only once
        return res.status(201).send({ msg: "Access granted" })
    }
    return res.status(404).send({ error: "Session expired" })
}

// put
export async function resetPassword(req, res) {
    try {
        if (!req.app.locals.resetSession) return res.status(404).send({ error: "Session expired" })
        const { username, password } = req.body;
        try {

            UserModel.findOne({ username })
                .then(user => {
                    bcrypt.hash(password, 10)
                        .then(hashedPassword => {
                            UserModel.updateOne({ username: user.username }, { password: hashedPassword }, function (err, data) {
                                if (err) throw err;
                                return res.status(201).send({ msg: "record updated" })
                            })
                        })
                        .catch(e => {
                            return res.status(500).send({ error: "Unable to hashed password" })
                        })
                })
                .catch(error => {
                    return res.status(404).send({ error: "Username not found" })
                })

        } catch (error) {
            return res.status(500).send({ error })
        }

    } catch (error) {
        return res.status(401).send({ error })
    }
}