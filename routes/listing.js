const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isLoggedIn,isOwner,validateListing} = require("../middleware.js");


// INDEX ROUTE - Show all listings
router.get("/", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
}));

// NEW ROUTE - Render form to create new listing
router.get("/new", isLoggedIn,(req, res) => {
    res.render("listings/new.ejs");
});

// SHOW ROUTE - Show a single listing by ID
router.get("/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate({path: "reviews",
        populate:{
            path:"author",
        },
    }).populate("owner");

    console.log("Fetched Listing:", listing); // ✅ Move logging before checking null

    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing });
}));

// CREATE ROUTE - Add new listing
router.post("/", isLoggedIn,validateListing, wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash("success", "New Listing Created");
    res.redirect("/listings");
}));

// EDIT ROUTE - Render form to edit listing
router.get("/:id/edit", isLoggedIn,isOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    console.log("Editing Listing:", listing);

    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    res.render("listings/edit.ejs", { listing });
}));


// UPDATE ROUTE - Update listing by ID
router.put("/:id", isLoggedIn,isOwner,validateListing, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    req.flash("success", "Listing Updated");
    res.redirect(`/listings/${id}`);
}));

// DELETE ROUTE - Delete a listing by ID
router.delete("/:id",isLoggedIn,isOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted");
    res.redirect("/listings");
}));

module.exports = router;
