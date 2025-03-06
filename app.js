const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const flash = require("connect-flash");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/damn";

main().then(() => console.log("Connected to DB"))
    .catch(err => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);
}

// Set up EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middleware
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));

// Session setup
const sessionOptions = {
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
   


app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


// Home Route
app.get("/home", (req, res) => {
    res.render("home.ejs");
});

// Routes
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


// 404 ERROR HANDLING
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something Went Wrong" } = err;
    res.status(statusCode).render("./listings/error.ejs", { message });
});


// Start Server
app.listen(3000, () => console.log("Server started on port 3000"));
