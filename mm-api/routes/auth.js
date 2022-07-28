const express = require("express")
const User = require("../models/user")
const { createUserJwt } = require("../utils/tokens")
const security = require("../middleware/security")
const router = express.Router()

router.post("/googlelogin", async (req, res, next) => {
    try {
        console.log('GOT HERE')
        const publicUser = await User.googleLogin(req.body)
        const token = createUserJwt(publicUser)   // encode the user as a payload
        res.status(200)
        res.json( { user: publicUser, token } )
    }
    catch (error) {
        next(error)
    }
})

router.post("/login", async (req, res, next) => {
    try {
        const publicUser = await User.login(req.body)
        const token = createUserJwt(publicUser)   // encode the user as a payload
        res.status(200)
        res.json( { user: publicUser, token } )
    }
    catch (error) {
        next(error)
    }
})

router.post("/register", async (req, res, next) => {
    try {
        const publicUser = await User.register(req.body)
        const token = createUserJwt(publicUser)   // encode the user as a payload
        res.status(201)
        res.json( { user: publicUser, token } )
    }
    catch (error) {
        next(error)
    }
})


// example of a "protected endpoint" since it is using security middleware
router.get("/me", security.requireAuthenticatedUser, async (req, res, next) => {
    try {
        // this bit of code gets the user information AFTER the user is authenticated 100%

        const publicUserFromDecodedToken = res.locals.user  
        // above code works 
        // Explanation: in utils/tokens.js, the createUserJwt function takes in the whole "public user" object

        // const user = await User.fetchUserByEmail(email)
        // const publicUser = User.returnPublicUser(user)

        // this line of code would be whatever you want to do with the publicUser
        // $ something meaninful would probably be here $
        // that we know is authorized to access their own information
        res.status(200)
        res.json( { user: publicUserFromDecodedToken } )
    }
    catch (error) {
        next(error)
    }
})

module.exports = router