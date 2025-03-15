// Load environment variables
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Import required modules
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const app = express();
const bodyParser = require('body-parser');
const cors = require("cors");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const session = require("express-session");
const flash = require("connect-flash");
const Listing = require("./models/listing");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const fs = require("fs");
const PDFDocument = require('pdfkit');

// Import routes
const listingRouter = require("./routes/listing");
const reviewRouter = require("./routes/review");
const userRouter = require("./routes/user");

// Database connection
const MONGO_URL = "mongodb://127.0.0.1:27017/damn";
mongoose.connect(MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.log("MongoDB Connection Error:", err));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up view engine and static files
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Session configuration
const sessionOptions = {
  secret: 'mysupersecretcode',
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

// Flash messages & user data middleware
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// Use routes
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

const razorpay = new Razorpay({
RAZORPAY_KEY_ID='your_key_id'
RAZORPAY_KEY_SECRET='your_key_secret'
});

// Route to create a Razorpay order
app.post('/create_order', async (req, res) => {
  const amount = parseInt(req.body.amount, 10);
  if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
  }

  const options = {
      amount: amount * 100, // Convert to paisa
      currency: 'INR',
      receipt: `order_rcptid_${Date.now()}`
  };

  try {
      const order = await razorpay.orders.create(options);
      console.log("Order Created:", order);
      res.json(order);
  } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Error creating order" });
  }
});

app.post('/store-payment-details', (req, res) => {
  req.session.paymentId = req.body.paymentDetails.paymentId;
  req.session.orderId = req.body.paymentDetails.orderId;
  req.session.amount = req.body.paymentDetails.amount;

  req.session.bookingId = req.body.bookingDetails.id;
  req.session.propertyName = req.body.bookingDetails.propertyName;
  req.session.checkInDate = req.body.bookingDetails.checkInDate;
  req.session.checkOutDate = req.body.bookingDetails.checkOutDate;

  req.session.receiptFileName = req.body.receiptFileName;

  res.sendStatus(200);
});

app.get('/payment-success', async (req, res) => {
  try {
      const paymentDetails = {
          paymentId: req.session.paymentId,
          orderId: req.session.orderId,
          amount: req.session.amount,
          currency: 'INR',
      };

      const bookingDetails = {
          id: req.session.bookingId,
          propertyName: req.session.propertyName,
          checkInDate: req.session.checkInDate,
          checkOutDate: req.session.checkOutDate,
      };

      const filename = req.session.receiptFileName;

      res.render('payment-success', { paymentDetails, bookingDetails, filename });
  } catch (error) {
      console.error('Error rendering payment success:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/download-receipt/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'receipts', filename);

  res.download(filePath, filename, (err) => {
      if (err) {
          console.error('Error downloading receipt:', err);
          res.status(404).send('Receipt not found');
      }
  });
});

async function generateReceipt(paymentDetails, bookingDetails, filename) {
  return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const filePath = path.join(__dirname, 'receipts', filename);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      doc.fontSize(25).text('Payment Receipt', 100, 100);
      doc.fontSize(12).text(`Payment ID: ${paymentDetails.paymentId}`, 100, 150);
      doc.fontSize(12).text(`Order ID: ${paymentDetails.orderId}`, 100, 170);
      doc.fontSize(12).text(`Amount: ${paymentDetails.amount} ${paymentDetails.currency}`, 100, 190);

      doc.fontSize(12).text(`Booking ID: ${bookingDetails.id}`, 100, 230);
      doc.fontSize(12).text(`Property: ${bookingDetails.propertyName}`, 100, 250);
      doc.fontSize(12).text(`Check-in: ${bookingDetails.checkInDate}`, 100, 270);
      doc.fontSize(12).text(`Check-out: ${bookingDetails.checkOutDate}`, 100, 290);

      doc.end();

      writeStream.on('finish', () => {
          resolve(filePath);
      });

      writeStream.on('error', reject);
  });
}

// 404 Route
app.all("*", (req, res) => {
  res.status(404).render("listings/error.ejs", { message: "Page Not Found!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
