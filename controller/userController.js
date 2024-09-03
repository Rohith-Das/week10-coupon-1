const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const User = require("../model/userModel");
const randomstring=require('randomstring')
const Product = require("../model/productModel");
const Address = require('../model/addressModel');
const Category = require('../model/categoryModel');
const Brand = require('../model/brandModel');
const Cart=require('../model/cartModel')
const Order = require('../model/orderModel');
const { authenticate } = require('passport');
const Razorpay = require("razorpay");
const Offer= require('../model/offerModel');
const  Wishlist=require('../model/wishlistModel');
const Coupon=require('../model/couponModel');

const loadHome = async (req, res) => {
  try {
    const user = req.session.user || req.user;
    const id = req.query.id;

    let userData = null;
    if (id) {
      userData = await User.findById(id);
    }

    const searchQuery = req.query.q || '';
    let products;

    if (searchQuery.trim()) {
      const regex = new RegExp(searchQuery, 'i');
      products = await Product.find({
        is_deleted: false,
        productName: regex
      }).populate('brand').populate('category');
    } else {
      products = await Product.find({ is_deleted: false })
        .populate('brand')
        .populate('category')
        .limit(10);
    }

    res.render('home', { user, userData, products, searchQuery });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send(error.message);
  }
};
// const loadHome = async (req, res) => {
//   try {
//     const user = req.session.user || req.user;
//     const id = req.query.id;

//     let userData = null;
//     if (id) {
//       userData = await User.findById(id);
//     }

//     const searchQuery = req.query.q || '';
//     let products = [];

//     if (searchQuery.trim()) {
//       const regex = new RegExp(searchQuery, 'i');
//       products = await Product.find({
//         is_deleted: false,
//         productName: regex
//       }).populate('brand').populate('category');
//     } else {
//       products = await Product.find({ is_deleted: false })
//         .populate('brand')
//         .populate('category')
//         .limit(10);  // You can adjust or remove this limit as needed
//     }

//     res.render('home2', { 
//       user, 
//       userData, 
//       products, 
//       searchQuery 
//     });
//   } catch (error) {
//     console.error('Error fetching products:', error);
//     res.status(500).send(error.message);
//   }
// };



const loadLogin = (req, res) => {
    try {
        res.render("login");
    } catch (error) {
        res.send(error.message);
    }
};

const loadRegister = (req, res) => {
    try {
        res.render("register");
    } catch (error) {
        res.send(error.message);
    }
};

// const authenticateUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find the user by email
//     const user = await User.findOne({ email: email });

//     if (!user) {
//       return res.render('login', { message: "Invalid email or password" });
//     }

//     // Check if the account is blocked
//     if (user.is_blocked === 1) {
//       return res.render('login', { message: "Your account has been blocked" });
//     }

//     // Compare the password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.render('login', { message: "Invalid email or password" });
//     }

//     // Successful authentication, store user ID in session
//     req.session.user_id = user._id;
//     res.redirect(`/home?id=${user._id}`);
    
//   } catch (error) {
//     // Handle any other errors
//     console.error(error);
//     res.status(500).render('login', { message: "An error occurred. Please try again later." });
//   }
// };

// user authenticate

const authenticateUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.render('login', { message: "Invalid email or password" });
    }

    // Check if the account is blocked
    if (user.is_blocked) {
      return res.render('login', { message: "Your account has been blocked" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render('login', { message: "Invalid email or password" });
    }

    // Successful authentication, store user ID in session
    req.session.user_id = user._id;
    res.redirect(`/home?id=${user._id}`);
    
  } catch (error) {
    // Handle any other errors
    console.error(error);
    res.status(500).render('login', { message: "An error occurred. Please try again later." });
  }
};



// user logout
const logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.send(err.message);
        }
        res.redirect('/home');
    });
};

// generate OTP
const generateOTP = () => {
    return randomstring.generate({
      length: 6,
      charset: "numeric",
    });
  };
  
  const securePassword = async (password) => {
    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      return passwordHash;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };
  
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
  const sendOTPEmail = (email, otp) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Verification",
  
      text: `Your OTP for verification is: ${otp}`,

    };
  
    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          console.log("Email sent: " + info.response);
          resolve(info.response);
        }
  });
  });
  };



let otpStore = {};

const insertUser = async (req, res) => {
  // console.log("insertUser called for email:", req.body.email);
  try {
    const { name, phone, email, password, confirmPassword } = req.body;

    const user = await User.findOne({ email: email });
    if (user) {
      return res.render("register", { message: "The email is already exists. Please login and continue" });
    } else {
      const spassword = await securePassword(password);

      const otp = generateOTP();
      otpStore[email] = {
        otp,
        userData: { name, phone, email, password: spassword },
      };
      console.log(otp), await sendOTPEmail(email, otp);

      res.redirect(`/verify-otp?email=${email}`);

    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadVerifyOtp = async (req, res) => {
  try {
    const { email } = req.query;
    if (!otpStore[email]) {
      res.status(400).send("No OTP found for this email");
      return;
    }

    res.render("otp", {
      email,
      message: "Enter the OTP sent to your email.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

// const verifyOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (otpStore[email] && otpStore[email].otp === otp) {
//       const userData = new User({
//         ...otpStore[email].userData,
       
//       });

//       const savedUser = await userData.save();
//       delete otpStore[email];

//       req.session.user = savedUser;
//       res.redirect(`/home?email=${email}`);

//     } else {
//       res.status(400).send("Invalid OTP");
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
// }
// };

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (otpStore[email] && otpStore[email].otp === otp) {
      const userData = new User({
        ...otpStore[email].userData,
       
      });

      const savedUser = await userData.save();
      delete otpStore[email];

      req.session.user = savedUser;
      
      // Send a success response with email data
      res.json({ success: true, email: email });
    } else {
      // Send an error response with a message
      res.json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


const resentOTP = async (req, res) => {
    try {
      const { email } = req.query;
      if (!otpStore[email]) {
        res.status(400).send("No OTP found for this email");
        return;
      }
  
      const newOTP = generateOTP();
      otpStore[email].otp = newOTP;
      await sendOTPEmail(email, newOTP);
      console.log(`Resent OTP for ${email}: ${newOTP}`);
  
      res.status(200).send("OTP resent successfully.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Failed to resend OTP.");
  }
  };

//   const loadShopPage = async (req, res) => {
//     try {
//         // Fetch user data
//         const userData = req.user || {}; // Adjust according to how you manage user data
//         const user = req.session.user || req.user;
//         // Fetch only listed products
//         const products = await Product.find({ is_deleted: false });

//         // Render the shop view and pass userData and products
//         res.render('shop', {user,userData, products });
//     } catch (error) {
//         console.error('Error loading shop page:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };

const loadShopPage = async (req, res) => {
  try {
      const user = req.session.user_id || req.user;
      const userData = await User.findById(user);

      const defaultFilters = {
          minPrice: 0,
          maxPrice: 20000,
          sort: 'popularity',
          page: 1,
          limit: 12,
          q: '',
      };

      const filters = { ...defaultFilters, ...req.query };

      const filter = { is_deleted: false };
      if (filters.brand) filter.brand = { $in: filters.brand.split(',') };
      if (filters.category) filter.category = { $in: filters.category.split(',') };
      if (filters.shape) filter.shape = { $in: filters.shape.split(',') };

      filter.price = {
          $gte: Number(filters.minPrice),
          $lte: Number(filters.maxPrice),
      };

      if (filters.q) {
          filter.$or = [
              { productName: { $regex: filters.q, $options: 'i' } },
              { description: { $regex: filters.q, $options: 'i' } }
          ];
      }

      let sortOption = {};
      switch (filters.sort) {
          case 'price-asc':
              sortOption = { price: 1 };
              break;
          case 'price-desc':
              sortOption = { price: -1 };
              break;
          case 'name-asc':
              sortOption = { productName: 1 };
              break;
          case 'name-desc':
              sortOption = { productName: -1 };
              break;
          default:
              sortOption = { createdAt: -1 };
      }

      const totalProducts = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / filters.limit);

      const products = await Product.find(filter)
          .sort(sortOption)
          .skip((filters.page - 1) * filters.limit)
          .limit(filters.limit)
          .populate('brand')
          .populate('category')
          .populate('offer')
          .select('productName price images category brand stockQuantity shape label _id offer');

      const productsWithDiscounts = products.map(product => {
          let discountedPrice = product.price;
          let discountPercentage = 0;

          if (product.offer && product.offer.length > 0) {
              const highestDiscountOffer = product.offer
                  .filter(offer => offer.status === 'active')
                  .reduce((max, offer) => offer.discount > max ? offer.discount : max, 0);

              if (highestDiscountOffer > 0) {
                  discountPercentage = highestDiscountOffer;
                  discountedPrice = product.price - (product.price * discountPercentage) / 100;
                  discountedPrice = Math.round(discountedPrice);
              }
          }

          return {
              ...product.toObject(),
              discountedPrice,
              discountPercentage
          };
      });

      const brands = await Brand.find();
      const categories = await Category.find();
      const shapes = [...new Set(await Product.distinct('shape'))];

      const generatePageUrl = (page) => {
          const newFilters = { ...filters, page };
          const queryString = Object.entries(newFilters)
              .filter(([key, value]) => value !== '' && value !== undefined)
              .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
              .join('&');
          return `/shop?${queryString}`;
      };

      res.render('shop', {
          userData,
          products: productsWithDiscounts,
          brands,
          categories,
          shapes,
          currentFilters: filters,
          totalPages,
          currentPage: parseInt(filters.page),
          totalProducts,
          generatePageUrl,
      });
  } catch (error) {
      console.error('Error loading shop page:', error);
      res.status(500).send('Internal Server Error');
  }
};



const getFilteredProducts = async (req, res) => {
  try {
    const { brand, category, minPrice, maxPrice, shape, sort ,q} = req.query;

    const filter = { is_deleted: false };

    if (q) {
      filter.$or = [
        { productName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (brand) filter.brand = { $in: brand.split(',') };
    if (category) filter.category = { $in: category.split(',') };
    if (shape) filter.shape = { $in: shape.split(',') };
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortOption = {};
    switch (sort) {
      case 'price-asc':
        sortOption = { price: 1 };
        break;
      case 'price-desc':
        sortOption = { price: -1 };
        break;
      case 'name-asc':
        sortOption = { productName: 1 };
        break;
      case 'name-desc':
        sortOption = { productName: -1 };
        break;
      default:
        sortOption = { createdAt: -1 }; // Default sort by newest
    }

    const products = await Product.find(filter)
      .sort(sortOption)
      .populate('brand')
      .populate('category');

    res.json({ products });
  } catch (error) {
    console.error('Error fetching filtered products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getProductDetails = async (req, res) => {
  try {
      const user = req.session.user_id || req.user;
      const userData = await User.findById(user);

      const productId = req.params.id;
      const product = await Product.findById(productId).populate('offer');

      if (!product) {
          return res.status(404).send('Product not found');
      }

      // Calculate the highest discount percentage and the discounted price
      let discountedPrice = null;
      let discountPercentage = 0;

      if (product.offer && product.offer.length > 0) {
          const highestDiscountOffer = product.offer
              .filter(offer => offer.status === 'active')
              .reduce((max, offer) => offer.discount > max ? offer.discount : max, 0);

          if (highestDiscountOffer > 0) {
              discountPercentage = highestDiscountOffer;
              discountedPrice = product.price - (product.price * discountPercentage) / 100;
              discountedPrice = Math.round(discountedPrice);
          }
      }

      const relatedProducts = await Product.find({
          _id: { $ne: productId }
      }).limit(4);

      const byBrand = await Product.find({
          brand: product.brand,
          _id: { $ne: productId }
      }).limit(4);

      res.render('singleProduct', {
          user,
          userData,
          product,
          discountedPrice,
          discountPercentage,
          relatedProducts,
          byBrand
      });
  } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
  }
};







// address
// Render address list

const loadAddressPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
   

    if (!userId) {
      return res.redirect('/login');
    }

    const addresses = await Address.find({ user: userId });


    res.render('address', { addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error); // Improved error logging
    res.status(500).send('Server Error');
  }
};



const addAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const newAddress = new Address({ ...req.body, user: userId });
    const savedAddress = await newAddress.save();  // Save address to the database
    res.status(200).json({ success: true, address: savedAddress });  // Return the new address
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};




const editAddress = async (req, res) => {
  try {
      const addressId = req.params.id;
      const updatedData = {
          fullName: req.body.fullName,
          addressLine1: req.body.addressLine1,
          addressLine2: req.body.addressLine2,
          city: req.body.city,
          state: req.body.state,
          postalCode: req.body.postalCode,
          country: req.body.country,
          phoneNumber: req.body.phoneNumber
      };

      const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

      if (updatedAddress) {
          res.status(200).json({ success: true, address: updatedAddress });
      } else {
          res.status(404).json({ success: false, message: 'Address not found' });
      }
  } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ success: false, message: 'Error updating address' });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    await Address.findByIdAndDelete(addressId);
    res.redirect('/address');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

const loadProfile = async (req, res) => {
  try {
      if (!req.session.user_id) {
          return res.redirect('/login');
      }
      const user = await User.findById(req.session.user_id);
      if (!user) {
          return res.status(404).send('User not found');
      }
      res.render('profile', { user, error: req.query.error ? JSON.parse(req.query.error) : null });
  } catch (error) {
      res.status(500).send(error.message);
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
      const { name, email, phone, currentPassword, newPassword, confirmNewPassword } = req.body;
      const user = await User.findById(req.session.user_id);

      if (!user) {
          return res.status(404).send('User not found');
      }

      const errors = {};

      // Validate name
      if (!/^[A-Za-z ]+$/.test(name)) {
          errors.name = 'Name should only contain letters and spaces.';
      }

      // Validate phone
      if (phone && !/^\d{10}$/.test(phone)) {
          errors.phone = 'Phone number should be 10 digits long.';
      }

      if (newPassword) {
          // Check if the current password matches
          const isMatch = await bcrypt.compare(currentPassword, user.password);
          if (!isMatch) {
              errors.currentPassword = 'Current password is incorrect.';
          }
          // Check if new password and confirm new password match
          if (newPassword !== confirmNewPassword) {
              errors.confirmNewPassword = 'New password and confirm password do not match.';
          }
      }

      if (Object.keys(errors).length > 0) {
          return res.redirect(`/profile?error=${JSON.stringify(errors)}`);
      }

      // Update user details
      user.name = name;
      user.phone = phone;

      if (newPassword) {
          user.password = await bcrypt.hash(newPassword, 10);
      }

      await user.save();

      // Redirect with success message
      res.redirect('/profile?success=' + (newPassword ? 'passwordChanged' : 'profileUpdated'));
  } catch (error) {
      res.status(500).send(error.message);
  }
};

// const addToCart = async (req, res) => {
//   try {
//       const userId = req.session.user_id;
//       const productId = req.params.id;

//       if (!userId) {
//           return res.json({ success: false, redirectTo: '/login' });
//       }

//       const product = await Product.findById(productId);
//       if (!product) {
//           return res.status(404).json({ success: false, message: 'Product not found' });
//       }

//       let cart = await Cart.findOne({ userId });

//       if (!cart) {
//           cart = new Cart({ userId, items: [] });
//       }

//       const existingItem = cart.items.find(item => item.productId.toString() === productId);

//       if (existingItem) {
//           if (existingItem.quantity >= 5) {
//               return res.json({ success: false, message: 'You cannot add more than 5 of this item to the cart.' });
//           }
//           existingItem.quantity += 1;
//       } else {
//           cart.items.push({ productId, quantity: 1 });
//       }

//       await cart.save();
      
//       const updatedItem = cart.items.find(item => item.productId.toString() === productId);
//       res.json({ success: true, cartItemCount: updatedItem.quantity });
//   } catch (error) {
//       console.error('Error adding to cart:', error);
//       res.status(500).json({ success: false, message: 'Error adding to cart' });
//   }
// };
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.id;

    if (!userId) {
      return res.json({ success: false, redirectTo: '/login' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stockQuantity === 0) {
      return res.json({ success: false, message: 'Product is out of stock' });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    let existingItem = cart.items.find(item => item.productId.toString() === productId);

    if (existingItem) {
      if (existingItem.quantity >= 5) {
        return res.json({ success: false, message: 'You cannot add more than 5 of this item to the cart.' });
      }
      existingItem.quantity += 1;
    } else {
      cart.items.push({ productId, quantity: 1 });
    }

    await cart.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Error adding to cart' });
  }
};

const getCart = async (req, res) => {
  try {
      const userId = req.session.user_id;
      const user = req.session.user || req.user;
      const id = req.query.id;

      let userData = null;
      if (id) {
          userData = await User.findById(id);
      }

      if (!userId) {
          return res.redirect('/login');
      }

      const cart = await Cart.findOne({ userId }).populate({
          path: 'items.productId',
          populate: { path: 'offer' }
      });

      // Calculate discounted prices for each item in the cart
      cart.items.forEach(item => {
          const product = item.productId;
          let discountPercentage = 0;
          let discountedPrice = product.price;

          if (product.offer && product.offer.length > 0) {
              const highestDiscountOffer = product.offer
                  .filter(offer => offer.status === 'active')
                  .reduce((max, offer) => offer.discount > max ? offer.discount : max, 0);

              if (highestDiscountOffer > 0) {
                  discountPercentage = highestDiscountOffer;
                  discountedPrice = Math.round(product.price * (1 - discountPercentage / 100));
              }
          }

          item.discountedPrice = discountedPrice;
      });

      res.render('cart', { cart, userData });
  } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).send('Error fetching cart');
  }
};



const updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user_id;

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: { path: 'offer' }
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const item = cart.items.find(item => item.productId._id.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    const product = item.productId;
    if (quantity > product.stockQuantity) {
      return res.status(400).json({ success: false, error: 'Quantity exceeds available stock', stockQuantity: product.stockQuantity });
    }

    item.quantity = quantity;

    // Calculate discounted price
    if (product.offer && product.offer.status === 'active') {
      item.discountedPrice = Math.round(product.price * (1 - product.offer.discount / 100));
    } else {
      item.discountedPrice = product.price;
    }

    await cart.save();

    const updatedItemTotal = item.quantity * item.discountedPrice;
    const updatedCartTotal = cart.items.reduce((total, cartItem) => 
      total + cartItem.quantity * (cartItem.discountedPrice || cartItem.productId.price), 0);

    res.json({
      success: true,
      updatedItemTotal,
      updatedCartTotal
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, error: 'Error updating cart' });
  }
};


const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user_id;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Recalculate cart total with discounted prices
    await cart.populate({
      path: 'items.productId',
      populate: { path: 'offer' }
    });

    cart.items.forEach(item => {
      const product = item.productId;
      if (product.offer && product.offer.status === 'active') {
        item.discountedPrice = Math.round(product.price * (1 - product.offer.discount / 100));
      } else {
        item.discountedPrice = product.price;
      }
    });

    const updatedCartTotal = cart.items.reduce((total, item) => 
      total + item.quantity * (item.discountedPrice || item.productId.price), 0);

    res.json({ success: true, updatedCartTotal });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, error: 'Error removing from cart' });
  }
};




// fogot-password

const loadForgotPassword = async (req, res) => {
  res.render('forgot-password');
};

const handleForgotPassword = async (req, res) => {
  try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
          return res.render('forgot-password', { message: "No account with that email address exists." });
      }

      // The random bytes generated are converted into a string of hexadecimal (hex) format

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetTokenExpiry;
      await user.save();

      const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
          },
      });

      const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

      const mailOptions = {
          to: user.email,
          from: process.env.EMAIL_USER,
          subject: 'Password Reset',
          text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
                `${resetUrl}\n\n` +
                `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      };

      await transporter.sendMail(mailOptions);
      res.render('forgot-password', { message: `An email has been sent to ${user.email} with further instructions.` });

  } catch (error) {
      console.error(error);
      res.status(500).render('forgot-password', { message: "An error occurred. Please try again later." });
  }
};

const loadResetPassword = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: Date.now() } });

  if (!user) {
      return res.render('forgot-password', { message: "Password reset token is invalid or has expired." });
  }

  res.render('reset-password', { token });
};

const handleResetPassword = async (req, res) => {
  try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
          return res.render('reset-password', { token, message: "Passwords do not match." });
      }

      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: Date.now() } });

      if (!user) {
          return res.render('forgot-password', { message: "Password reset token is invalid or has expired." });
      }

      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();

      res.redirect('/login');
  } catch (error) {
      console.error(error);
      res.status(500).render('reset-password', { token, message: "An error occurred. Please try again later." });
  }
};
// Initialize Razorpay inside the controller
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect("/login");
    }

    const userData = await User.findById(userId);
    const addresses = await Address.find({ user: userId });
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: { path: 'offer' }
    });

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    let subtotal = 0;
    let couponDiscount = 0; // Initialize coupon discount

    // Calculate discounted prices and totals
    cart.items.forEach(item => {
      const product = item.productId;
      let discountPercentage = 0;
      let discountedPrice = product.price; // Default to original price

      // Check if the product has an active offer
      if (product.offer && product.offer.length > 0) {
        const activeOffers = product.offer.filter(offer => offer.status === 'active');
        if (activeOffers.length > 0) {
          const maxDiscount = Math.max(...activeOffers.map(offer => offer.discount));
          discountPercentage = maxDiscount;
          discountedPrice = product.price - (product.price * discountPercentage / 100);
        }
      }

      item.discountedPrice = discountedPrice;
      item.discountPercentage = discountPercentage;
      item.totalPrice = discountedPrice * item.quantity; // Calculate total for each item
      subtotal += item.totalPrice; // Add to subtotal
    });

    // Calculate coupon discount if a valid coupon is applied
    if (req.body.couponCode) {
      const coupon = await Coupon.findOne({ code: req.body.couponCode, status: 'active' });
      if (coupon && subtotal >= coupon.minAmount) {
        couponDiscount = Math.min((subtotal * coupon.discount) / 100, coupon.maxDiscount);
      }
    }

    const totalAmount = subtotal - couponDiscount; // Calculate final amount

    // Fetch all active coupons
    const coupons = await Coupon.find({ status: 'active' });

    res.render('checkout', {
      addresses,
      cart,
      userData,
      totalAmount: totalAmount.toFixed(2),
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      coupons, // Pass the active coupons to the view
      couponDiscount: couponDiscount.toFixed(2)
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
};


const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: { path: 'offer' }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Calculate total amount considering discounts
    let totalAmount = 0;
    cart.items.forEach(item => {
      const product = item.productId;
      let discountedPrice = product.price;

      if (product.offer && product.offer.length > 0) {
        const activeOffers = product.offer.filter(offer => offer.status === 'active');
        if (activeOffers.length > 0) {
          const maxDiscount = Math.max(...activeOffers.map(offer => offer.discount));
          discountedPrice = product.price - (product.price * maxDiscount / 100);
        }
      }

      totalAmount += discountedPrice * item.quantity;
    });

    const options = {
      amount: Math.round(totalAmount * 100), // Razorpay expects amount in paisa
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`
    };

    const order = await razorpay.orders.create(options);

    res.json({ 
      success: true, 
      order: order,
      amount: Math.round(totalAmount * 100) // Send amount back to client in paisa
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Error creating Razorpay order' });
  }
};


// payment confirmation
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const crypto = require('crypto');
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment is successful, proceed with order completion
      const userId = req.session.user_id;
      const cart = await Cart.findOne({ userId }).populate('items.productId');

      if (!cart) {
        return res.status(400).json({ success: false, message: "Cart not found" });
      }

      const totalAmount = cart.items.reduce((total, item) => {
        const product = item.productId;
        let discountedPrice = product.price;

        if (product.offer && product.offer.length > 0) {
          const activeOffers = product.offer.filter(offer => offer.status === 'active');
          if (activeOffers.length > 0) {
            const maxDiscount = Math.max(...activeOffers.map(offer => offer.discount));
            discountedPrice = product.price - (product.price * maxDiscount / 100);
          }
        }

        return total + discountedPrice * item.quantity;
      }, 0);

      const order = await Order.findOneAndUpdate(
        { order_id: razorpay_order_id },
        {
          user_id: userId,
          items: cart.items.map(item => ({
            product_id: item.productId._id,
            productName: item.productId.productName,
            quantity: item.quantity,
            price: item.productId.price,
            discountedPrice: item.discountedPrice,
            total: item.discountedPrice * item.quantity
          })),
          total_amount: Math.round(totalAmount * 100), // Store total amount in paisa
          payment_type: "Razorpay",
          payment_status: "Completed",
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature
        },
        { new: true, upsert: true }
      );

      // Clear the cart
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      res.json({ success: true, message: "Payment verified and order placed successfully.", orderId: order.order_id });
    } else {
      // Payment failed
      res.status(400).json({ success: false, message: "Payment verification failed." });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
};

 
const checkoutAddAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.json({ success: false, message: 'User not logged in' });
    }

    const newAddress = new Address({
      user: userId,
      fullName: req.body.fullName,
      addressLine1: req.body.addressLine1,
      addressLine2: req.body.addressLine2,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postalCode,
      country: req.body.country,
      phoneNumber: req.body.phoneNumber
    });

    await newAddress.save();

    // Fetch all updated addresses after saving the new one
    const addresses = await Address.find({ user: userId });

    res.json({ success: true, addresses });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'An error occurred while adding the address' });
  }
};

const checkoutEditAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.json({ success: false, message: 'User not logged in' });
    }

    const addressId = req.params.id;
    const updatedAddress = {
      fullName: req.body.fullName,
      addressLine1: req.body.addressLine1,
      addressLine2: req.body.addressLine2,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postalCode,
      country: req.body.country,
      phoneNumber: req.body.phoneNumber
    };

    await Address.findByIdAndUpdate(addressId, updatedAddress);

    // Fetch all updated addresses after saving the changes
    const addresses = await Address.find({ user: userId });

    res.json({ success: true, addresses });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'An error occurred while updating the address' });
  }
};

const checkoutDeleteAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.json({ success: false, message: 'User not logged in' });
    }

    const addressId = req.params.id;
    await Address.findByIdAndDelete(addressId);

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'An error occurred while deleting the address' });
  }
};



const generateOrderId = () => {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const verifyRazorpayPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  return razorpay_signature === expectedSign;
};
const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect("/login");
    }

    const { shippingAddress, paymentMethod, razorpay_payment_id, razorpay_order_id, razorpay_signature, appliedCouponCode } = req.body;
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ message: 'Shipping address and payment method are required' });
    }

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: {
        path: 'offer',
        model: 'Offer'
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        return res.status(404).json({ message: `Product not found for item ${item._id}` });
      }
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for product: ${product.productName}` });
      }

      let originalPrice = product.price;
      let bestDiscount = 0;
      let discountedPrice = originalPrice;

      if (product.offer && product.offer.length > 0) {
        // Find the best offer (maximum discount)
        for (const offer of product.offer) {
          if (offer.status === 'active' && offer.discount > bestDiscount) {
            bestDiscount = offer.discount;
          }
        }

        // Calculate the discounted price based on the best offer
        discountedPrice = Math.round(originalPrice * (1 - bestDiscount / 100));
      }

      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product._id,
        productName: product.productName,
        quantity: item.quantity,
        price: originalPrice,
        discountedPrice: discountedPrice,
        discount: bestDiscount,
        total: itemTotal,
        status: 'Pending'
      });

      // Update stock quantity
      product.stockQuantity -= item.quantity;
      await product.save();
    }

    // Apply coupon discount if a coupon code was provided
    let couponDiscount = 0;
    let couponDetails = null;
    if (appliedCouponCode) {
      const coupon = await Coupon.findOne({ code: appliedCouponCode, status: 'active' });
      if (coupon && new Date() <= coupon.expiryDate && subtotal >= coupon.minAmount) {
        couponDiscount = Math.min((subtotal * coupon.discount) / 100, coupon.maxDiscount || Infinity);
        couponDetails = {
          code: coupon.code,
          discount: coupon.discount,
          discountAmount: couponDiscount
        };
      }
    }

    const totalAmount = subtotal - couponDiscount;

    const address = await Address.findById(shippingAddress);
    if (!address) {
      return res.status(404).json({ message: 'Shipping address not found' });
    }

    let paymentStatus = 'Pending';
    if (paymentMethod === 'Razorpay') {
      // Verify Razorpay payment
      const isValidPayment = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (isValidPayment) {
        paymentStatus = 'Completed';
      } else {
        return res.status(400).json({ message: 'Invalid Razorpay payment' });
      }
    }

    const newOrder = new Order({
      user_id: user._id,
      order_id: generateOrderId(),
      address_id: {
        fullName: address.fullName,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        phoneNumber: address.phoneNumber
      },
      items: orderItems,
      subtotal: subtotal,
      coupon_discount: couponDiscount,
      coupon_details: couponDetails,
      total_amount: totalAmount,
      payment_type: paymentMethod,
      payment_status: paymentStatus,
      razorpay_order_id: razorpay_order_id || "",
      razorpay_payment_id: razorpay_payment_id || "",
      razorpay_signature: razorpay_signature || ""
    });

    const savedOrder = await newOrder.save();
    console.log('savedOrder', savedOrder);

    // Clear cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    res.json({ 
      success: true, 
      orderId: savedOrder._id,
      orderDetails: {
        items: savedOrder.items,
        subtotal: savedOrder.subtotal,
        couponDiscount: savedOrder.coupon_discount,
        couponDetails: savedOrder.coupon_details,
        totalAmount: savedOrder.total_amount,
        paymentStatus: savedOrder.payment_status,
        shippingAddress: savedOrder.address_id
      }
    });

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'An error occurred while placing the order. Please try again later.' });
  }
};




// const orderSummary = async (req, res) => {
//   try {
//     const userId = req.session.user_id;
//     const orderId = req.params.orderId; // Get orderId from route parameters

//     if (!orderId) {
//       return res.status(400).render('error', { message: 'Order ID is required' });
//     }

//     const order = await Order.findById(orderId)
//       .populate('user_id')
//       .populate({
//         path: 'items.product_id',
//         select: 'productName imageUrl price offer',
//         populate: { path: 'offer' }
//       });

//     if (!order) {
//       return res.status(404).render('error', { message: 'Order not found' });
//     }

//     let totalAmount = 0;

//     // Calculate the total amount and apply discount if available
//     order.items.forEach(item => {
//       let discountedPrice = item.product_id.price;

//       if (item.product_id.offer && item.product_id.offer.status === 'active') {
//         discountedPrice = Math.round(item.product_id.price * (1 - item.product_id.offer.discount / 100));
//       }

//       item.discountedPrice = discountedPrice; // Store discounted price for each item
//       totalAmount += discountedPrice * item.quantity; // Calculate total amount
//     });

//     // Store the total amount in the order object
//     order.total_amount = totalAmount;

//     res.render('orderSummary', { order });
//   } catch (error) {
//     console.error(error);
//     res.status(500).render('error', { message: 'Error fetching order summary' });
//   }
// };

const orderSummary = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const orderId = req.params.orderId;

    if (!orderId) {
      return res.status(400).render('orderSummary', { error: 'Order ID is required' });
    }

    const order = await Order.findById(orderId)
      .populate('user_id')
      .populate('items.product_id');

    if (!order) {
      return res.status(404).render('orderSummary', { error: 'Order not found' });
    }

    // Check if the order belongs to the logged-in user
    if (order.user_id._id.toString() !== userId) {
      return res.status(403).render('orderSummary', { error: 'Unauthorized access to this order' });
    }

    res.render('orderSummary', { 
      order, 
      error: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('orderSummary', { error: 'Error fetching order summary' });
  }
};

// Render the orders page
const renderOrdersPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect("/login");
    }
    
    const orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .populate('user_id')
      
      .populate({
        path: 'items.product_id',
        select: 'productName price offer',
        populate: { path: 'offer' }
      });

    // Calculate total amounts for each order
   

    res.render('orders', { orders });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving orders: ' + error.message);
  }
};

const renderViewOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect("/login");
    }
    
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('items.product_id');

    if (!order) {
      return res.status(404).render('error', { message: 'Order not found' });
    }
    const orders = await Order.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .populate('user_id')
    
    .populate({
      path: 'items.product_id',
      select: 'productName price offer',
      populate: { path: 'offer' }
    });

    res.render('viewOrder', { order,orders});
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error retrieving order details' });
  }
};


// Handle cancel order item request
const cancelOrderItem = async (req, res) => {
  try {
    const { itemId, cancellationReason } = req.body;

    const order = await Order.findOne({ "items._id": itemId }).populate('items.product_id');

    if (!order) {
      return res.status(404).render('error', { message: 'Order item not found' });
    }

    const item = order.items.id(itemId);

    // Check if the order status allows cancellation
    if (['Pending', 'Processing', 'Delivered'].includes(item.status)) {
      item.status = 'Cancelled';
      item.cancellation_reason = cancellationReason;

      // Revert the stock quantity
      const product = item.product_id;
      product.stockQuantity += item.quantity;
      await product.save();

      await order.save();
    } else {
      return res.status(400).render('error', { message: 'Order cannot be cancelled at this stage' });
    }

    res.redirect(`/viewOrder/${order._id}`);
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error cancelling order item' });
  }
};

// Handle return request for order item
const requestReturn = async (req, res) => {
  try {
      const { itemId, returnReason } = req.body;

      const order = await Order.findOne({ "items._id": itemId });

      if (!order) {
          return res.status(404).render('error', { message: 'Order item not found' });
      }

      const item = order.items.id(itemId);

      // Check if the order status allows a return request
      if (item.status === 'Delivered') {
          item.status = 'Return Requested';
          item.return_reason = returnReason;
          await order.save();
      } else {
          return res.status(400).render('error', { message: 'Order cannot be returned at this stage' });
      }

      res.redirect(`/viewOrder/${order._id}`);
  } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: 'Error processing return request' });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName images price stockQuantity offer',
      populate: {
        path: 'offer',
        select: 'discount status'
      }
    });

    console.log('Fetched Wishlist:', JSON.stringify(wishlist, null, 2));

    if (!wishlist) {
      return res.render('wishlist', { wishlistItems: [] });
    }

    const wishlistItems = wishlist.items.map(item => {
      const product = item.productId;
      console.log('Processing Product:', JSON.stringify(product, null, 2));

      let discountedPrice = product.price;
      let discountPercentage = 0;

      if (product.offer && Array.isArray(product.offer) && product.offer.length > 0) {
        const activeOffers = product.offer.filter(offer => offer.status === 'active');
        console.log('Active Offers:', JSON.stringify(activeOffers, null, 2));

        if (activeOffers.length > 0) {
          const highestDiscount = Math.max(...activeOffers.map(offer => offer.discount));
          discountPercentage = highestDiscount;
          discountedPrice = product.price - (product.price * discountPercentage / 100);
          discountedPrice = Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
        }
      }

      console.log('Calculated Discount:', {
        originalPrice: product.price,
        discountedPrice,
        discountPercentage
      });

      return {
        _id: product._id,
        productName: product.productName,
        image: product.images[0],
        price: product.price,
        stockQuantity: product.stockQuantity,
        discountedPrice,
        discountPercentage
      };
    });

    console.log('Final Wishlist Items:', JSON.stringify(wishlistItems, null, 2));

    res.render('wishlist', { wishlistItems });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).send('An error occurred while fetching the wishlist');
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.productId;

    if (!userId) {
      return res.json({ success: false, redirectTo: '/login' });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }

    const existingItem = wishlist.items.find(item => item.productId.toString() === productId);

    if (!existingItem) {
      wishlist.items.push({ productId });
      await wishlist.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.productId;

    const wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
      wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId);
      await wishlist.save();
      res.json({ success: true, message: 'Product removed from wishlist' });
    } else {
      res.status(404).json({ success: false, message: 'Wishlist not found' });
    }
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// apply coupons
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user_id;

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode, status: 'active' });

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid or inactive coupon code.' });
    }

    // Check if the coupon has expired
    if (new Date() > coupon.expiryDate) {
      return res.json({ success: false, message: 'This coupon has expired.' });
    }

    // Get the user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
      return res.json({ success: false, message: 'Cart not found.' });
    }

    // Calculate cart total
    let cartTotal = cart.items.reduce((total, item) => {
      return total + (item.productId.price * item.quantity);
    }, 0);

    // Check if cart total meets the minimum amount requirement
    if (cartTotal < coupon.minAmount) {
      return res.json({ success: false, message: `Minimum purchase amount of $${coupon.minAmount} required to use this coupon.` });
    }

    // Calculate discount
    let discountAmount = (cartTotal * coupon.discount) / 100;
    
    // Apply max discount if applicable
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

    return res.json({
      success: true,
      discount: coupon.discount,
      maxDiscount: coupon.maxDiscount,
      message: 'Coupon applied successfully.'
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ success: false, message: 'An error occurred while applying the coupon.' });
  }
};






module.exports = {
    loadHome,
    loadLogin,
    loadRegister,
    verifyOTP,
    loadVerifyOtp,
    insertUser,
    resentOTP,
    authenticateUser,
    logoutUser,
    loadProfile,
    loadShopPage ,
 
    getFilteredProducts,
     getProductDetails,
     loadAddressPage,
    //  loadAddAddressPage,
     addAddress,
    
     deleteAddress,
     editAddress,
     updateProfile,
     addToCart,
     getCart,
     updateCart,
     removeFromCart,
     loadCheckout,
     checkoutAddAddress,
     checkoutDeleteAddress,
     checkoutEditAddress,
     loadForgotPassword,
     handleForgotPassword,
     loadResetPassword,
     handleResetPassword,
     placeOrder,
     orderSummary,
     renderOrdersPage,
     renderViewOrder,
     renderViewOrder,
     cancelOrderItem,
     requestReturn,
     createRazorpayOrder,
     verifyPayment,
     addToWishlist,
     removeFromWishlist,
     getWishlist,
     applyCoupon
   
    
  
    
    
};