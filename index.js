import express from 'express'
import 'dotenv/config'
import cors from "cors";
import { MongoClient } from 'mongodb';

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
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})