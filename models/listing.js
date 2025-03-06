const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        type: Object,
        default: {
            filename: "default",
            url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600"
        },
        set: (v) => {
            if (!v || v === "") {  
                return { filename: "default", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600" };
            }
            if (typeof v === "string") {  
                return { filename: "custom", url: v };
            }
            return v;
        }
    },
    price: {
        type: Number,
        required: true,   // ✅ Makes price mandatory
        min: [1, "Price must be at least 1"]  // ✅ Ensures price is at least 1
    },
    location: String,
    country: String,
    reviews :[
        {
            type : Schema.Types.ObjectId,
            ref : "Review",
        },
    ],

    owner:{
        
            type : Schema.Types.ObjectId,
            ref : "User",
    },
});

listingSchema.post("findOneandDelete",async(listing)=>{
if(listing){
    await Review.deleteMany({id: {$in: listing.reviews}});
}
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
