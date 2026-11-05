import express from 'express'
import 'dotenv/config'
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
const app = express();
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
const storage = multer.memoryStorage();
const upload = multer({ storage });
app.use(cors({
  origin: "http://localhost:3000",
}));
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
app.post("/add-studio", async (req, res) => {
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
app.get("/studios/:id", async (req, res) => {
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

app.patch("/studios/:id", async (req, res) => {
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

app.delete("/studios/:id", async (req, res) => {
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






app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})