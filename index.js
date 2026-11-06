import express from 'express'
import 'dotenv/config'
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
const app = express();
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import { createRemoteJWKSet, jwtVerify } from 'jose';
const storage = multer.memoryStorage();
const upload = multer({ storage });
app.use(cors({
  origin: "http://localhost:3000",
}));

// verify api
const verifyToken= async(req,res,next)=>{
  const authHeader= req.headers.authorization
  // console.log(authHeader);
  if(!authHeader){
        return res.status(401).send({msg: 'Unauthorized'})

  }
const token = authHeader.split(" ")[1]
  console.log(token);


if(!token){
  return res.status(401).send({ msg: "Unauthorized! "})
}

const JWKS = createRemoteJWKSet(new URL(`http://localhost:3000/api/auth/jwks`))


try{
  const {payload} = await jwtVerify(token, JWKS) 
// console.log(payload);
  next()

}
catch(error){
  return res.status(401).send({msg: "Server Error"})
}

}





// imbb 
app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No image uploaded" });
    }

    const imageBase64 = req.file.buffer.toString("base64");

    const formData = new FormData();
    formData.append("image", imageBase64);

    const response = await axios.post(
      "https://api.imgbb.com/1/upload",
      formData,
      {
        params: {
          key: process.env.IMGBB_API_KEY,
        },
        headers: formData.getHeaders(),
      }
    );

    res.send({
      message: "Image uploaded successfully",
      imageUrl: response.data.data.url,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send({ message: "Image upload failed" });
  }
});
app.use(express.json());const port = 5000

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
connectToMongoDB()

app.get('/', (req, res) => {
  res.send('Hello World!')
})
// get form data addstudio
app.post("/add-studio",verifyToken,async (req, res) => {
  const studioData = req.body;

  const db = client.db("studiospace");
  const studioCollection = db.collection("studios");

  const result = await studioCollection.insertOne(studioData);

  res.status(201).send({
    message: "Studio added successfully!",
    insertedId: result.insertedId,
  });
});
// 
app.get("/studios", async (req, res) => {
  const db = client.db("studiospace");
  const studioCollection = db.collection("studios");

  const studios = await studioCollection.find().toArray();

  res.send(studios);
});
// Get studios listed by a specific owner
app.get("/my-listings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const db = client.db("studiospace");
    const studioCollection = db.collection("studios");

    const myStudios = await studioCollection
      .find({
        $or: [
          { ownerEmail: email },
          { hostEmail: email },
        ],
      })
      .toArray();

    res.send(myStudios);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch your studio listings",
    });
  }
});




// for studio details
// Get a single studio by ID
app.get("/studios/:id", verifyToken,async (req, res) => {
  const { id } = req.params;

  // Check if the ID is valid
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid studio ID",
    });
  }

  const db = client.db("studiospace");
  const studioCollection = db.collection("studios");

  const studio = await studioCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!studio) {
    return res.status(404).json({
      message: "Studio not found",
    });
  }

  res.json(studio);
});

// get updated info and update in mongodb

app.patch("/studios/:id",verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedStudio = req.body;

  const db = client.db("studiospace");
  const studioCollection = db.collection("studios");

  const result = await studioCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedStudio }
  );

  res.send(result);
});
// delete a studio from listing

app.delete("/studios/:id",verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid studio ID",
      });
    }

    if (!email) {
      return res.status(400).send({
        message: "User email is required",
      });
    }

    const db = client.db("studiospace");
    const studioCollection = db.collection("studios");

    const result = await studioCollection.deleteOne({
      _id: new ObjectId(id),
      $or: [
        { ownerEmail: email },
        { hostEmail: email },
      ],
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Studio not found or you are not the owner",
      });
    }

    res.send({
      message: "Studio deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to delete studio",
    });
  }
});

// Create a new booking
app.post("/bookings",verifyToken, async (req, res) => {
  try {
    const {
      studioId,
      customerName,
      customerEmail,
      bookingDate,
      startTime,
      endTime,
    } = req.body;

    // Validate required fields
    if (
      !studioId ||
      !customerName?.trim() ||
      !customerEmail?.trim() ||
      !bookingDate ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).send({
        message: "Please provide all booking information",
      });
    }

    // Validate studio ID
    if (!ObjectId.isValid(studioId)) {
      return res.status(400).send({
        message: "Invalid studio ID",
      });
    }

    // Validate date and time formats
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
    ) {
      return res.status(400).send({
        message: "Invalid booking date or time",
      });
    }

    if (endTime <= startTime) {
      return res.status(400).send({
        message: "End time must be after start time",
      });
    }

    const db = client.db("studiospace");

    const studioCollection = db.collection("studios");
    const bookingCollection = db.collection("bookings");

    // Find the studio
    const studio = await studioCollection.findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).send({
        message: "Studio not found",
      });
    }

    // Check for overlapping bookings
    const existingBooking = await bookingCollection.findOne({
      studioId,
      bookingDate,
      status: { $in: ["Pending", "Confirmed"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (existingBooking) {
      return res.status(409).send({
        message: "This time slot is already booked",
      });
    }

    // Calculate total rental price
    const start = startTime.split(":").map(Number);
    const end = endTime.split(":").map(Number);

    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    const bookedHours = (endMinutes - startMinutes) / 60;

    const totalPrice = bookedHours * Number(studio.hourlyRate);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return res.status(400).send({
        message: "Invalid studio rental price",
      });
    }

    // Create booking document
    const bookingData = {
      studioId,
      studioTitle: studio.title,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      bookingDate,
      startTime,
      endTime,
      totalPrice,
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await bookingCollection.insertOne(bookingData);

    res.status(201).send({
      message: "Booking created successfully",
      insertedId: result.insertedId,
      booking: bookingData,
    });

  } catch (error) {
    console.error("Booking error:", error);

    res.status(500).send({
      message: "Failed to create booking",
    });
  }
});



// Get bookings for a specific customer
app.get("/bookings", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        message: "Customer email is required",
      });
    }

    const db = client.db("studiospace");
    const bookingCollection = db.collection("bookings");

    const bookings = await bookingCollection
      .find({
        customerEmail: email.trim().toLowerCase(),
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(bookings);

  } catch (error) {
    console.error("Fetch bookings error:", error);

    res.status(500).send({
      message: "Failed to fetch bookings",
    });
  }
});


// Cancel a pending booking
app.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    // Validate booking ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid booking ID",
      });
    }

    if (!email) {
      return res.status(400).send({
        message: "Customer email is required",
      });
    }

    const db = client.db("studiospace");
    const bookingCollection = db.collection("bookings");

    const result = await bookingCollection.updateOne(
      {
        _id: new ObjectId(id),
        customerEmail: email.trim().toLowerCase(),
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Pending booking not found",
      });
    }

    res.send({
      message: "Booking cancelled successfully",
    });

  } catch (error) {
    console.error("Cancel booking error:", error);

    res.status(500).send({
      message: "Failed to cancel booking",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})