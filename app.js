const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
module.exports = app;
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

intilizDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error : ${e.message}`);
    process.exit(1);
  }
};

intilizDbAndServer();

app.post("/users/", async (request, response) => {
  const { username, password } = request.body;
  const findUserQuery = `
    SELECT *
    FROM user
    WHERE username='${username}'`;
  const user = await db.get(findUserQuery);
  if (user === undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const addUserQuery = `
        INSERT INTO user(username,password)
        VALUES ('${username}','${hashedPassword}');`;
    await db.run(addUserQuery);
    response.send("User Created Successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const findUserQuery = `
    SELECT *
    FROM user
    WHERE username='${username}'`;
  const user = await db.get(findUserQuery);
  if (user === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtTocken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtTocken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

/// GET STATES

app.get("/states/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
        SELECT 
            state_id AS stateId,
            state_name AS stateName,
            population AS population
        FROM 
            state;`;
  const stateArr = await db.all(getStateQuery);
  response.send(stateArr);
});

/// GET STATE

app.get("/states/:stateId", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
        SELECT 
            state_id AS stateId,
            state_name AS stateName,
            population AS population
        FROM 
            state
        WHERE 
            state_id = '${stateId}';`;
  const stateArr = await db.get(getStateQuery);
  response.send(stateArr);
});

/// POST district

app.post("/districts/", authenticateToken, async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const insertDistrictRow = `
        INSERT INTO  district (district_name, state_id, cases, cured, active, deaths)
        VALUES 
            ('${districtName}',
            '${stateId}',
             '${cases}',
             '${cured}',
             '${active}',
             '${deaths}'
            );`;
  await db.run(insertDistrictRow);
  response.send("District Successfully Added");
});

/// GET DISTRICT

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getdistrictQuery = `
        SELECT 
            district_id AS districtId,
            district_name AS districtName,
            state_id AS stateId,
            cases AS cases,
            cured AS cured,
            active AS active,
            deaths AS deaths
           
        FROM 
            district
        WHERE 
            district_id = '${districtId}';`;
    const districtArr = await db.get(getdistrictQuery);
    response.send(districtArr);
  }
);

/// DELETE district
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
        DELETE FROM district 
        WHERE district_id = '${districtId}';`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

/// UPDATE district

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtDetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const updateDistrictRow = `
        UPDATE  district
        SET
           district_name = '${districtName}',
            state_id = '${stateId}',
            cases = '${cases}',
            cured = '${cured}',
            active = '${active}',
            deaths = '${deaths}'
         WHERE 
            district_id = '${districtId}';`;

    await db.run(updateDistrictRow);
    response.send("District Details Updated");
  }
);

/// get statistics

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateStatistic = `
        SELECT 
            SUM(district.cases) AS totalCases,
            SUM(district.cured) AS totalCured,
            SUM(district.active) AS totalActive,
            SUM(district.deaths) AS totalDeaths
        FROM 
            district INNER JOIN state ON district.state_id = state.state_id     
        WHERE 
          district.state_id  ='${stateId}'; `;
    const getStatArr = await db.get(getStateStatistic);
    response.send(getStatArr);
  }
);
