const User = require('../model/userModel');
const Category = require('../model/categoryModel');
const Brand = require('../model/brandModel');
const Product = require('../model/productModel');
const bcrypt = require('bcrypt');
const { query } = require('express');
const multer = require('../middleware/multer');
const Order = require('../model/orderModel');
const Offer= require('../model/offerModel');
const Coupon=require('../model/couponModel');


const adminLogin = async (req, res) => {
    try {
        res.render('adminLogin');
    } catch (error) {
        res.send(error.message);
    }
}
const adminDash = async (req, res) => {
    try {
        res.render('adminDashboard');
    } catch (error) {
        res.send(error.message);
    }
}
const verifyAdmin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({ email: email });

        if (userData) {
            if (userData.is_blocked) {
                return res.render('adminLogin', { message: "Your account is blocked. Please contact support." });
            }

            const passwordMatch = await bcrypt.compare(password, userData.password);

            if (passwordMatch) {
                if (userData.is_admin === 1) {
                    req.session.admin_id = userData._id; 
                    res.redirect("/admin/dashboard");
                } else {
                    res.render('adminLogin', { message: "Email and password are incorrect" });
                }
            } else {
                res.render('adminLogin', { message: "Email and password are incorrect" });
            }
        } else {
            res.render('adminLogin', { message: "Email and password are incorrect" });
        }
    } catch (error) {
        res.send(error.message);
    }
};



const allCustomers = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of items per page
        const skip = (page - 1) * limit;

        const query = {
            is_admin: 0,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ]
        };

        const totalUsers = await User.countDocuments(search ? query : { is_admin: 0 });
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(search ? query : { is_admin: 0 })
            .skip(skip)
            .limit(limit);

        res.render('customer3', { 
            users, 
            search, 
            currentPage: page, 
            totalPages,
            totalUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};







// Block User
const blockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { is_blocked: true });
        res.redirect('/admin/dashboard/allcustomer');
    } catch (error) {
        res.send(error.message);
    }
};

// Unblock User
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { is_blocked: false });
        res.redirect('/admin/dashboard/allcustomer');
    } catch (error) {
        res.send(error.message);
    }
};

const loadCategory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Get page and limit from query parameters
        const search = req.query.search || '';

        const query = {
            $or: [
                { categoryName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };

        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);
        const currentPage = Math.max(1, Math.min(page, totalPages)); // Ensure valid page number

        const categories = await Category.find(query)
            .skip((currentPage - 1) * limit)
            .limit(limit);

        res.render('categoryList', {
            categories,
            search,
            currentPage,
            totalPages
        });
    } catch (error) {
        res.send(error.message);
    }
};

const addCategory = async (req, res) => {
    try {
        const { categoryName, description, status } = req.body;

        // Check if the category already exists
        const existingCategory = await Category.findOne({ categoryName });

        if (existingCategory) {
            // Fetch all categories from the database
            const categories = await Category.find();
            // Render the view with an error message and existing categories
            return res.render('categoryList', { 
                categories, 
                message: 'Category already exists' 
            });
        }

        // Create and save new category
        const newCategory = new Category({ categoryName, description, status });
        await newCategory.save();

        // Redirect to the category list page
        res.redirect('/admin/dashboard/categoryList');
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const editCategory = async (req, res) => {
    try {
        const { id, categoryName, description, status } = req.body;
        const updatedCategory = await Category.findByIdAndUpdate(id, { categoryName, description, status }, { new: true });

        if (updatedCategory) {
            res.redirect('/admin/dashboard/categoryList');
        } else {
            res.redirect('/admin/dashboard/categoryList', { message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const toggleCategoryStatus = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);

        if (category) {
            category.is_delete = !category.is_delete;
            await category.save();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const listCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.findByIdAndUpdate(categoryId, { is_delete: false });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

const unlistCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.findByIdAndUpdate(categoryId, { is_delete: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};




const loadBrand = async (req, res) => {
    try {
        const search = req.query.search || ''; // Search query, if any
        const page = parseInt(req.query.page) || 1; // Current page, default to 1
        const limit = 5; // Limit of items per page
        const skip = (page - 1) * limit; // Calculate the number of documents to skip

        // Build the query
        const query = search 
            ? { name: { $regex: search, $options: 'i' } } // Case-insensitive search by brand name
            : {}; // No filter if no search term

        // Get total number of brands
        const totalBrands = await Brand.countDocuments(query);

        // Fetch brands with pagination and search
        const brands = await Brand.find(query)
            .skip(skip)
            .limit(limit);

        // Calculate total pages
        const totalPages = Math.ceil(totalBrands / limit);

        // Render the 'brands' template with pagination data
        res.render('brands', {
            brands,
            currentPage: page,
            totalPages,
            totalBrands,
            search
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};





const addBrand = async (req, res) => {
    try {
        const { brandName, description, status } = req.body;

        // Check if the brand already exists
        const existingBrand = await Brand.findOne({ brandName });

        if (existingBrand) {
            // Fetch all brands from the database
            const brands = await Brand.find();
            // Render the view with an error message and existing brands
            return res.render('brands', { 
                brands, 
                message: 'Brand already exists' 
            });
        }

        // Create and save new brand
        const newBrand = new Brand({ brandName, description, is_deleted: status === 'unlisted' });
        await newBrand.save();

        // Redirect to the brand list page
        res.redirect('/admin/dashboard/brandList');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
const editBrand = async (req, res) => {
    try {
        const { id, brandName, description, status } = req.body;

        // Check for duplicate brand name
        const existingBrand = await Brand.findOne({ brandName, _id: { $ne: id } });

        if (existingBrand) {
            const brands = await Brand.find();
            return res.render('brands', { 
                brands, 
                message: 'Brand name already exists' 
            });
        }

        const updatedBrand = await Brand.findByIdAndUpdate(id, { brandName, description, is_deleted: status === 'unlisted' }, { new: true });

        if (updatedBrand) {
            res.redirect('/admin/dashboard/brandList');
        } else {
            res.redirect('/admin/dashboard/brandList', { message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const toggleBrandStatus = async (req, res) => {
    try {
        const { brandId } = req.params;
        const brand = await Brand.findById(brandId);

        if (brand) {
            // Toggle the is_deleted status
            brand.is_deleted = !brand.is_deleted;
            await brand.save();

            res.json({ success: true, message: 'Brand status updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Function to get active categories
const getActiveCategories = async () => {
    return await Category.find({ is_delete: false, status: 'active' });
};

// Function to get active brands
const getActiveBrands = async () => {
    return await Brand.find({ is_deleted: false });
};

const loadProducts = async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const categories = await Category.find();
      const brands = await Brand.find();
  
      const totalProducts = await Product.countDocuments();
      const totalPages = Math.ceil(totalProducts / limit);
      const currentPage = Math.max(1, Math.min(page, totalPages));
  
      const products = await Product.find()
        .populate('category')
        .populate('brand')
        .skip((currentPage - 1) * limit)
        .limit(limit);
  
      res.render('product', {
        categories,
        products,
        brands,
        currentPage,
        totalPages
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  };
  
  const loadAddProduct = async (req, res) => {
    try {
        const categories = await getActiveCategories();
        const brands = await getActiveBrands();
        res.render('addProduct', { categories, brands });
    } catch (err) {
        console.error('Error fetching categories or brands:', err);
        res.status(500).send('Internal Server Error');
    }
};

const addProduct = async (req, res) => {
    try {
        // console.log('Request Body:', req.body);
        const {
            productName,
            stockQuantity,
            category,
            price,
            stock,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod
        } = req.body;

        const newProduct = new Product({
            productName,
            stockQuantity,
            category,
            price,
            stock,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod,
            images: req.files.map(file => `/uploads/products/${file.filename}`), 
            imageUrl: req.files.length > 0 ? `/uploads/products/${req.files[0].filename}` : null
        });

        await newProduct.save();
        
        // Send a JSON response instead of redirecting
        res.json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};




const loadEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Fetch all active categories and brands
        const categories = await Category.find({ is_delete: false, status: 'active' });
        const brands = await Brand.find({ is_deleted: false });

        res.render('editProduct', {
            product,
            categories,
            brands
        });
    } catch (error) {
        console.error('Error loading edit product page:', error);
        res.status(500).send('Server Error');
    }
};


// Edit an existing product
const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const {
            productName,
            stockQuantity,
            category,
            price,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod,
            status,
            'strapDetails.width': strapWidth,
            existingImages // Capture existing images from the request body
        } = req.body;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update product details
        product.productName = productName;
        product.stockQuantity = parseInt(stockQuantity);
        product.category = category;
        product.price = parseFloat(price);
        product.description = description;
        product.brand = brand;
        product.thickness = parseFloat(thickness);
        product.shape = shape;
        product.waterResistance = waterResistance;
        product.warrantyPeriod = warrantyPeriod;
        product.isListed = status === 'Listed';
        product.strapDetails = { ...product.strapDetails, width: parseFloat(strapWidth) };

        // Handle images
        const updatedImages = [];
        for (let i = 0; i < 3; i++) {
            if (req.files && req.files[i]) {
                updatedImages[i] = `/uploads/products/${req.files[i].filename}`;
            } else if (existingImages[i]) {
                updatedImages[i] = existingImages[i];
            } else {
                updatedImages[i] = null; // No image for this slot
            }
        }

        product.images = updatedImages.filter(img => img !== null); // Filter out any null values
        product.imageUrl = product.images[0];

        await product.save();

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the product' });
    }
};


const toggleProductStatus = async (req, res) => {
    try {
      const productId = req.params.productId;
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      product.is_deleted = !product.is_deleted;
      await product.save();
  
      return res.json({ success: true, is_deleted: product.is_deleted });
    } catch (error) {
      console.error('Error toggling product status:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };


  const loadOrderList = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query; // Get page, limit, and search from query parameters

        const totalOrders = await Order.countDocuments({
            $or: [
                { order_id: { $regex: search, $options: 'i' } },
                { 'user_id.name': { $regex: search, $options: 'i' } },
                { payment_status: { $regex: search, $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(totalOrders / limit);
        const currentPage = Math.max(1, Math.min(page, totalPages)); // Ensure valid page number

        const orders = await Order.find({
            $or: [
                { order_id: { $regex: search, $options: 'i' } },
                { 'user_id.name': { $regex: search, $options: 'i' } },
                { payment_status: { $regex: search, $options: 'i' } }
            ]
        })
        .populate('user_id')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit);

        res.render('adminOrderList', { orders, currentPage, totalPages, search });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Order item not found' });
        }

        // Define allowed status transitions
        const statusTransitions = {
            'Pending': ['Processing'],
            'Processing': ['Shipped'],
            'Shipped': ['Delivered'],
            'Delivered': ['Cancelled', 'Returned'],
            'Cancelled': [],
            'Return Requested': ['Returned', 'Rejected'],
            'Returned': [],
            'Rejected': []
        };

        // Check if the new status is allowed
        if (!statusTransitions[item.status].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status change' });
        }

        item.status = status;
        await order.save();

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};



// offers

const listOffers = async (req, res) => {
    try {
        const offers = await Offer.find()
            .populate('productIds', 'productName')
            .populate('categoryIds', 'categoryName')
            .exec();

        const products = await Product.find({ is_deleted: false }).select('productName');
        const categories = await Category.find({ is_delete: false }).select('categoryName');

        res.render('offerList', { offers, products, categories });
    } catch (error) {
        console.error("Error fetching offers:", error);
        res.status(500).send("Error fetching offers: " + error.message);
    }
};


const createOfferForm = async (req, res) => {
    try {
        const products = await Product.find({ is_deleted: false }).select('productName');
        const categories = await Category.find({ is_delete: false }).select('categoryName');
        res.render('offer', { products, categories });
    } catch (error) {
        res.status(500).send("Error fetching products and categories");
    }
};

const createOffer = async (req, res) => {
    try {
        const { offerName, discount, expireDate, offerType, references } = req.body;

        const newOffer = new Offer({
            offerName,
            discount,
            expireDate,
            offerType,
            productIds: offerType === 'product' ? references : [],
            categoryIds: offerType === 'category' ? references : [],
        });

        await newOffer.save();

        // Function to calculate discounted price
        const calculateDiscountedPrice = (price, discount) => {
            return Math.round(price * (1 - discount / 100));
        };

        // Fetch the products to apply the offer
        let productsToUpdate = [];
        if (offerType === 'product') {
            productsToUpdate = await Product.find({ _id: { $in: newOffer.productIds } });
        } else if (offerType === 'category') {
            productsToUpdate = await Product.find({ category: { $in: newOffer.categoryIds } });
        }

        // Update the products with the best (highest) offer
        for (const product of productsToUpdate) {
            let bestOffer = newOffer;  // Assume current offer is the best offer

            // Check if the product already has an offer applied
            if (product.offer) {
                const existingOffer = await Offer.findById(product.offer);
                if (existingOffer && existingOffer.discount > newOffer.discount) {
                    bestOffer = existingOffer;  // The existing offer is better
                }
            }

            // Apply the best offer
            product.offer = bestOffer._id;
            product.discountedPrice = calculateDiscountedPrice(product.price, bestOffer.discount);
            await product.save();
        }

        res.redirect('/admin/dashboard/offers');
    } catch (error) {
        console.error("Error creating offer:", error);
        res.status(500).send("Error creating offer: " + error.message);
    }
};


const toggleOfferStatus = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        offer.status = offer.status === "active" ? "inactive" : "active";
        await offer.save();

        let productsToUpdate = [];

        if (offer.offerType === "product") {
            productsToUpdate = await Product.find({ _id: { $in: offer.productIds } });
        } else if (offer.offerType === "category") {
            productsToUpdate = await Product.find({ category: { $in: offer.categoryIds } });
        }

        // Function to calculate discounted price
        const calculateDiscountedPrice = (price, discount) => {
            return Math.round(price * (1 - discount / 100));
        };

        for (const product of productsToUpdate) {
            if (offer.status === "inactive") {
                // If the offer becomes inactive, remove the discount from related products
                if (product.offer && product.offer.toString() === offer._id.toString()) {
                    product.offer = null;
                    product.discountedPrice = product.price; // Remove discount
                }
            } else {
                // If the offer becomes active, apply the discount to related products
                // But first, check if there's a better offer already applied
                if (!product.offer || (product.offer && offer.discount > product.offer.discount)) {
                    product.offer = offer._id;
                    product.discountedPrice = calculateDiscountedPrice(product.price, offer.discount);
                }
            }
            await product.save();
        }

        res.redirect('/admin/dashboard/offers');
    } catch (error) {
        console.error("Error toggling offer status:", error);
        res.status(500).send("Error toggling offer status: " + error.message);
    }
};

const getOfferDetails = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate('productIds', 'productName')
            .populate('categoryIds', 'categoryName');
        res.json(offer);
    } catch (error) {
        console.error("Error fetching offer details:", error);
        res.status(500).json({ error: "Error fetching offer details" });
    }
};

const editOffer = async (req, res) => {
    try {
        const { offerId, offerName, discount, expireDate, offerType, references } = req.body;

        const updatedOffer = await Offer.findByIdAndUpdate(offerId, {
            offerName,
            discount,
            expireDate,
            offerType,
            productIds: offerType === 'product' ? references : [],
            categoryIds: offerType === 'category' ? references : [],
        }, { new: true });

        // Recalculate discounted prices for affected products
        const calculateDiscountedPrice = (price, discount) => {
            return Math.round(price * (1 - discount / 100));
        };

        let productsToUpdate = [];
        if (offerType === 'product') {
            productsToUpdate = await Product.find({ _id: { $in: updatedOffer.productIds } });
        } else if (offerType === 'category') {
            productsToUpdate = await Product.find({ category: { $in: updatedOffer.categoryIds } });
        }

        for (const product of productsToUpdate) {
            let bestOffer = updatedOffer;

            if (product.offer && product.offer.toString() !== updatedOffer._id.toString()) {
                const existingOffer = await Offer.findById(product.offer);
                if (existingOffer && existingOffer.discount > updatedOffer.discount) {
                    bestOffer = existingOffer;
                }
            }

            product.offer = bestOffer._id;
            product.discountedPrice = calculateDiscountedPrice(product.price, bestOffer.discount);
            await product.save();
        }

        res.json({ success: true, message: "Offer updated successfully" });
    } catch (error) {
        console.error("Error updating offer:", error);
        res.status(500).json({ success: false, message: "Error updating offer: " + error.message });
    }
};

// coupon management
const listCoupons = async (req, res) => {
    try {
      const coupons = await Coupon.find();
      res.render('couponList', { coupons }); // Render coupon list view with coupons
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).send('Error fetching coupons');
    }
  };
  
  // Show Create Coupon Form
  const showCreateCouponForm = async (req, res) => {
    try {
      res.render('coupon'); // Render the form to create a new coupon
    } catch (error) {
      console.error('Error rendering create coupon form:', error);
      res.status(500).send('Error displaying the create coupon form');
    }
  };
  
  // Create Coupon
  const createCoupon = async (req, res) => {
    try {
      const { code, description, discount, minAmount, maxDiscount, expiryDate } = req.body;
      const newCoupon = new Coupon({
        code,
        description,
        discount,
        minAmount,
        maxDiscount,
        expiryDate
      });
      await newCoupon.save();
      
      // Redirect to coupon list with success message
      res.render('couponList', { successMessage: 'Coupon created successfully!', coupons: await Coupon.find() });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.render('coupon', { errorMessage: 'Error creating coupon. Please try again.' });
    }
  };
  
  // Get Coupon by ID (for Edit Modal)
  const getCouponById = async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
      res.json(coupon);
    } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).json({ message: 'Error fetching coupon' });
    }
  };
  
  // Update Coupon
  const updateCoupon = async (req, res) => {
    try {
      const { id, code, description, discount, minAmount, maxDiscount, expiryDate } = req.body;
      await Coupon.findByIdAndUpdate(id, {
        code,
        description,
        discount,
        minAmount,
        maxDiscount,
        expiryDate
      });
      
      // Redirect to coupon list with success message
      const coupons = await Coupon.find();
      res.render('couponList', { successMessage: 'Coupon updated successfully!', coupons });
    } catch (error) {
      console.error('Error updating coupon:', error);
      const coupons = await Coupon.find();
      res.render('couponList', { errorMessage: 'Error updating coupon. Please try again.', coupons });
    }
  };
  
  // Toggle Coupon Status (List/Unlist)
  const toggleCouponStatus = async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) {
        return res.status(404).send('Coupon not found');
      }
      coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
      await coupon.save();
  
      // Redirect to coupon list with success message
      res.redirect('/admin/dashboard/coupons');
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      res.render('couponList', { errorMessage: 'Error toggling coupon status. Please try again.', coupons: await Coupon.find() });
    }
  };
  


module.exports = {
    adminLogin,
    adminDash,
    
    verifyAdmin,
    allCustomers,
  
    blockUser,
    unblockUser,
    loadCategory,
    addCategory,
    editCategory ,
    toggleCategoryStatus,
    listCategory,
    unlistCategory,
  
    loadBrand,
    editBrand,
    addBrand,
    toggleBrandStatus,
    loadProducts,
    loadAddProduct,
    addProduct,
    loadEditProduct,
    editProduct,
    toggleProductStatus,
    loadOrderList,
    updateOrderStatus,
    createOffer,
    createOfferForm ,
    listOffers,
    toggleOfferStatus,
    getOfferDetails,
    editOffer,
    listCoupons,
    createCoupon,
    showCreateCouponForm,
    getCouponById,
    updateCoupon,
    toggleCouponStatus
  
 
   
   
   

   
    
};
