const express = require("express");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");

const db = new sqlite3.Database("mydatabase.db");
const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

// In-memory cache
const cache = new Map();

// Serve static files from the root directory
app.use(express.static("./"));

// Optional: Default route to serve index.html
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "." });
});

app.post("/api/check", async (req, res) => {
  const { sourceCoordinates, destCoordinates } = req.body;

  try {
    // Check if data is in the cache
    const cachedResults = await getFromCache(sourceCoordinates, destCoordinates);

    if (cachedResults) {
      console.log("Data retrieved from cache");
      res.json({ exists: true, algResults: cachedResults });
    } else {
      // If not in cache, check the database
      const dbResults = await getFromDatabase(sourceCoordinates, destCoordinates);

      if (dbResults) {
        // Save to cache for future use
        await saveToCache(sourceCoordinates, destCoordinates, dbResults);
        console.log("Data retrieved from database");
        res.json({ exists: true, algResults: dbResults });
      } else {
        console.log("Data does not exist in the database");
        res.json({ exists: false });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

app.post("/api/save-result", async (req, res) => {
  const { sourceCoordinates, destCoordinates, algResults } = req.body;

  try {
    // Save to the database
    await saveToDatabase(sourceCoordinates, destCoordinates, algResults);
    console.log("Data saved to database");

    // Save to cache for future use
    await saveToCache(sourceCoordinates, destCoordinates, algResults);
    console.log("Data saved to cache");

    res.send({ message: "Data saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving data");
  }
});

app.delete("/api/delete-directions", async (req, res) => {
  const { sourceCoordinates, destCoordinates } = req.body;

  try {
    // Delete from the database
    await deleteFromDatabase(sourceCoordinates, destCoordinates);
    console.log("Data deleted from database");

    // Delete from the cache
    await deleteFromCache(sourceCoordinates, destCoordinates);
    console.log("Data deleted from cache");

    res.status(200).send({ message: "Data deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting data");
  }
});
async function getFromCache(sourceCoordinates, destCoordinates) {
  const cacheKey = `${JSON.stringify(sourceCoordinates)}-${JSON.stringify(destCoordinates)}`;
  const cachedResults = cache.get(cacheKey);

  if (cachedResults) {
    // Check if the data is also in the database
    const dbResults = await getFromDatabase(sourceCoordinates, destCoordinates);

    if (!dbResults) {
      // Data is in cache but not in the database
      console.log("Data found in cache but not in the database. Generating new data.");

      // Delete from cache
      cache.delete(cacheKey);

      // Run the genetic algorithm to generate new data
      const newData = await geneticAlgorithm();

      // Save to cache
      saveToCache(sourceCoordinates, destCoordinates, newData);

      // Save to the database
      saveToDatabase(sourceCoordinates, destCoordinates, newData);

      return newData;
    }

    // Data is in both cache and database
    return cachedResults;
  }

  return null;
}


async function saveToCache(sourceCoordinates, destCoordinates, algResults) {
  const cacheKey = `${JSON.stringify(sourceCoordinates)}-${JSON.stringify(destCoordinates)}`;
  cache.set(cacheKey, algResults);
}

async function getFromDatabase(sourceCoordinates, destCoordinates) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT algResults FROM genetic_data2 WHERE sourceCoordinates = ? AND destCoordinates = ?",
      [JSON.stringify(sourceCoordinates), JSON.stringify(destCoordinates)],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? JSON.parse(row.algResults) : null);
        }
      }
    );
  });
}

async function saveToDatabase(sourceCoordinates, destCoordinates, algResults) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO genetic_data2 (sourceCoordinates, destCoordinates, algResults) VALUES (?, ?, ?)",
      [
        JSON.stringify(sourceCoordinates),
        JSON.stringify(destCoordinates),
        JSON.stringify(algResults),
      ],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function deleteFromDatabase(sourceCoordinates, destCoordinates) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM genetic_data2 WHERE sourceCoordinates = ? AND destCoordinates = ?",
      [JSON.stringify(sourceCoordinates), JSON.stringify(destCoordinates)],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function deleteFromCache(sourceCoordinates, destCoordinates) {
  const cacheKey = `${JSON.stringify(sourceCoordinates)}-${JSON.stringify(destCoordinates)}`;
  cache.delete(cacheKey);
}

app.listen(3000, () => console.log("Server running on port 3000"));
