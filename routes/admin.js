const express = require("express");
const router = express.Router();
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

// require product model
let Product = require("../models/products");

//=============check authenticated-----------
function isAuthen(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // req.flash("error_msg", "Please login");
  res.redirect("/login");
}

let browser;

// scrap
async function scrapeData(url, page) {
  try {
    await page.goto(url, { waitUntil: "load", timeout: 0 });
    const html = await page.evaluate(() => document.body.innerHTML);
    const $ = cheerio.load(html);
    let title = $("#productTitle").text();
    let price = $("#priceblock_ourprice").text().slice(1);
    let seller = "Amazon";
    let checkOutOfStock = $("#availability").text().replace(/\n/g, "");
    let asin = url.split("/").pop();
    return {
      title,
      price,
      seller,
      url,
      checkOutOfStock,
      asin,
    };
  } catch (error) {
    console.log(error);
  }
}

//================new product ====================
router.get("/product/new", isAuthen, async (req, res, next) => {
  try {
    let url = req.query.search;
    if (url) {
      browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();
      let result = await scrapeData(url, page);
      let productData = {
        title: result.title,
        price: "$" + result.price,
        stock: result.checkOutOfStock,
        productUrl: result.url,
        seller: result.seller,
        asin: result.asin,
      };
      res.render("./admin/newProduct", { productData: productData });
      browser.close();
    } else {
      let productData = {
        title: "",
        price: "",
        stock: "",
        productUrl: "",
        seller: "",
        asin: "",
      };
      res.render("./admin/newProduct", { productData: productData });
    }
  } catch (error) {
    req.flash("error_msg", "error: " + error);
    res.redirect("/product/new");
  }
});
router.post("/product/new", isAuthen, async (req, res, next) => {
  try {
    const { url, title, price, stock, seller, asin } = req.body;
    let newProduct = {
      title: title,
      newPrice: price,
      oldPrice: price,
      newStock: stock,
      oldStock: stock,
      asin: asin,
      company: seller,
      url: url,
      updateStatus: "Not Updated",
    };
    const product = await Product.findOne({ asin: asin });
    if (product) {
      req.flash("error_msg", "Product already exist in the database");
      return res.redirect("/product/new");
    }
    await Product.create(newProduct);
    req.flash("success_msg", "Product added successfully in the database");
    return res.redirect("/product/new");
  } catch (error) {
    req.flash("error_msg", `${error}`);
    return res.redirect("/product/new");
  }
});

// ============== search product ==================
router.get("/product/search", isAuthen, async (req, res, next) => {
  res.render("./admin/search", { product: "" });
});
router.post("/product/search", isAuthen, async (req, res, next) => {
  const product = await Product.findOne({ asin: req.body.asin });
  if (!product) {
    req.flash("error_msg", `Not found product`);
    return res.redirect("/product/search");
  }
  res.render("./admin/search", { product: product });
});

// =============== inStock ======================
router.get("/products/instock", isAuthen, async (req, res, next) => {
  const products = await Product.find({});
  res.render("./admin/inStock", { products: products });
});

// =============== out of stock ==================
router.get("/products/outofstock", isAuthen, async (req, res, next) => {
  const products = await Product.find({});
  res.render("./admin/outOfStock", { products: products });
});

// ================= price change =================
router.get("/products/pricechanged", isAuthen, async (req, res, next) => {
  const products = await Product.find({});
  res.render("./admin/priceChanged", { products: products });
});

// ==================dashboard=================
router.get("/", isAuthen, async (req, res, next) => {
  const products = await Product.find({});
  res.render("./admin/dashboard", { products: products });
});

// ================== updated ===============
router.get("/products/updated", isAuthen, async (req, res) => {
  const products = await Product.find({ updateStatus: "Updated" });
  res.render("./admin/updatedProducts", { products: products });
});

// ================== not update ===============
router.get("/products/notupdated", isAuthen, async (req, res) => {
  const products = await Product.find({ updateStatus: "Not Updated" });
  res.render("./admin/notUpdatedProducts", { products: products });
});

// ============= update ==================
router.get("/update", isAuthen, (req, res) => {
  res.render("./admin/update", { message: "" });
});
router.post("/update", isAuthen, async (req, res) => {
  try {
    res.render("./admin/update", { message: "update started." });
    const products = await Product.find({});
    console.log(products);
    for (let i = 0; i < products.length; i++) {
      await Product.updateOne(
        { url: products[i].url },
        {
          $set: {
            oldPrice: products[i].newPrice,
            oldStock: products[i].newStock,
            updateStatus: "Not Updated",
          },
        }
      );
    }
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    for (let i = 0; i < products.length; i++) {
      let result = await scrapeData(products[i].url, page);
      await Product.updateOne(
        { url: products[i].url },
        {
          $set: {
            title: result.title,
            newPrice: "$" + result.price,
            newStock: result.checkOutOfStock,
            updateStatus: "Updated",
          },
        }
      );
    }
    browser.close();
  } catch (error) {
    req.flash("error_msg", "ERROR: " + err);
    res.redirect("/dashboard");
  }
});

// ============= DELETE====================
router.delete("/delete/product/:id", isAuthen, async (req, res) => {
  try {
    let id = { _id: req.params.id };
    await Product.deleteOne(id);
    req.flash("success_msg", "Product deleted successfully.");
    res.redirect("/dashboard");
  } catch (error) {
    req.flash("error_msg", "ERROR: " + error);
    res.redirect("/dashboard");
  }
});

module.exports = router;
