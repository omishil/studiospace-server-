import express from 'express'
import 'dotenv/config'
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
const app = express();

app.use(cors({
  origin: "http://localhost:3000",
}));

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
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})