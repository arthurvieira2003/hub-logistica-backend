const express = require("express");
const app = express();

app.use(express.json());

const ouroNegroRoute = require("./routes/ouroNegro.route");

app.use("/ouroNegro", ouroNegroRoute);

app.listen(4010, () => {
  console.log("Server is running on port 4010");
});
