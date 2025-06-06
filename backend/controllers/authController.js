const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOTP, sendOTPEmail } = require('../services/authService');

// Handle user registration  
const registerUser = async (req, res) => {
  const { fullName, email, password, isServiceProvider, role, phoneNumber, serviceType, mfaPreference } = req.body;

  try {
    //  Check if the user already exists 
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Password validation before hashing
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.' 
      });
    }
    
    console.log("Before Hashing:", password);

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("After Hashing:", hashedPassword);
    
     //  Restrict admin registration to specific emails
     const allowedAdminEmails = ["chamutharu482@gmail.com"];
     if (role === "admin" && !allowedAdminEmails.includes(email)) {
       return res.status(403).json({ message: " You are not allowed to register as an admin!" });
     }

     //  Validate required fields for service providers 
    if (isServiceProvider) {
      if (!role || !phoneNumber || !serviceType ) {
        return res.status(400).json({ message: 'Missing required service provider details' });
      }

      user = new User({
        fullName,
        email,
        password: hashedPassword,
        role: 'service_provider',
        phoneNumber,
        serviceType,
        mfaPreference,
        approvalStatus: false
      });

      // Check if the user is an admin
    } else if (role === "admin") {
      user = new User({
        fullName,
        email,
        password: hashedPassword,
        role: "admin",
        phoneNumber,
        mfaPreference
      });

      await user.save();

      return res.status(201).json({
        message: " Registration successful! Admin account created.",
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          mfaPreference: user.mfaPreference
        }
      });

    }else {      //  If the user is a normal customer, create a new customer user
      user = new User({
        fullName,
        email,
        password: hashedPassword,
        role: 'customer'
      });
    }

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: ' User not found' });

    if (user.role === 'service_provider' && !user.approvalStatus) {
      return res.status(403).json({ message: ' Service provider not approved yet' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: ' Invalid credentials' });

    if (user.mfaPreference) {
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await User.updateOne({ email }, { otp, otpExpires });
      await sendOTPEmail(email, otp);
      return res.status(200).json({ message: 'OTP sent successfully', otpRequired: true });
    }

    //  Generate JWT token with 6-hour expiration
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '6h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error(' Error in login:', error);
    res.status(500).json({ message: ' Server error' });
  }
};

//handle otp varification
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: ' Invalid or expired OTP' });
    }

    await User.updateOne({ email }, { $unset: { otp: '', otpExpires: '' } });

    //  Generate JWT token with 1-hour expiration
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error(' Error in OTP verification:', error);
    res.status(500).json({ message: ' Server error' });
  }
};

module.exports = { registerUser, loginUser, verifyOTP };
