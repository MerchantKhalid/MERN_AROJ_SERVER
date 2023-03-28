import express from "express";
import cors from "cors";
import morgan from "morgan";
import connect from "./database/conn.js";
import router from "./router/route.js";

const app = express()

//middleware
app.use(express.json())
app.use(cors())
app.use(morgan('tiny'))
app.disable('x-powered-by')

const port = 8080;

// HTTP get request
app.get("/", (req, res) => {
    res.status(201).json("Home get request")
})

// api routes
app.use('/api',router)

// start server only when we have valid connection
connect().then(() => {
    try {
        app.listen(port, () => {
            console.log(`Server Connected to http://localhost:${port}`)
        })
    } catch (error) {
        console.log("Server cannot connect")
    }
}).catch(error=>{
    console.log("Invalid Connection")
})

