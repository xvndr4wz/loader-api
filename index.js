const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Auto-load semua file js di api/ secara rekursif
function loadRoutes(dir, baseRoute = "") {
  fs.readdirSync(dir).forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadRoutes(fullPath, `${baseRoute}/${item}`);
    } else if (item.endsWith(".js")) {
      const route = `/api${baseRoute}/${item.replace(".js", "")}`;
      const handler = require(fullPath);
      app.all(route, typeof handler === "function" ? handler : handler.default);
      console.log(`Loaded: ${route}`);
    }
  });
}

loadRoutes(path.join(__dirname, "api"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
