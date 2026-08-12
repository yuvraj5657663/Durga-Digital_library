import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { BookOpen, Clock, Wifi, Shield, Users, Zap, Phone, MapPin, X, ArrowRight, Sparkles, Cpu, Armchair, Lock, BatteryCharging, Monitor, ChevronRight, Star, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const LandingPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    shift: 'Special 6-Hour',
    joiningDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const { scrollY } = useScroll();
  const navbarOpacity = useTransform(scrollY, [0, 100], [0.8, 0.95]);
  const navbarBlur = useTransform(scrollY, [0, 100], [8, 16]);

  const slides = [
    {
      title: "Transform Your Learning Journey",
      subtitle: "Modern Library for Modern Minds",
      description: "Experience an ultra-modern digital library designed for academic excellence with cutting-edge facilities",
      image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600",
      accent: "from-blue-500 to-purple-600"
    },
    {
      title: "Study Without Boundaries",
      subtitle: "24/7 Access to Excellence",
      description: "Round-the-clock access to a peaceful, productive environment that fuels your success",
      image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1600",
      accent: "from-purple-500 to-pink-600"
    },
    {
      title: "Future-Ready Infrastructure",
      subtitle: "Smart Facilities, Smart Learning",
      description: "Air-conditioned halls, high-speed WiFi, smart seating, and uninterrupted power backup",
      image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600",
      accent: "from-pink-500 to-orange-600"
    }
  ];

  const highlights = [
    { icon: Zap, text: "⚡ High-Speed Wi-Fi", color: "from-yellow-400 to-orange-500" },
    { icon: BookOpen, text: "📚 10,000+ Books & Journals", color: "from-blue-400 to-indigo-500" },
    { icon: Shield, text: "🤫 Quiet Study Zone", color: "from-green-400 to-emerald-500" },
    { icon: Clock, text: "🕐 24/7 Open", color: "from-purple-400 to-pink-500" }
  ];

  const features = [
    { 
      icon: Cpu, 
      title: "High-Speed Internet", 
      description: "100+ Mbps fiber connection for seamless research and online learning",
      color: "from-blue-500 to-cyan-500"
    },
    { 
      icon: Armchair, 
      title: "Ergonomic Seating", 
      description: "Premium chairs designed for long study sessions with comfort",
      color: "from-purple-500 to-pink-500"
    },
    { 
      icon: Lock, 
      title: "Personal Locker", 
      description: "Secure storage for your books, laptops, and personal belongings",
      color: "from-green-500 to-emerald-500"
    },
    { 
      icon: BatteryCharging, 
      title: "Charging Ports", 
      description: "Multiple charging stations at every desk for your devices",
      color: "from-orange-500 to-red-500"
    },
    { 
      icon: Monitor, 
      title: "AC Environment", 
      description: "Climate-controlled halls for optimal study comfort year-round",
      color: "from-cyan-500 to-blue-500"
    },
    { 
      icon: Shield, 
      title: "CCTV Security", 
      description: "24/7 surveillance ensuring a safe and secure environment",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const timingPlans = [
    {
      name: "Special 6-Hour Batch",
      time: "10:00 AM - 4:00 PM",
      price: "₹350/month",
      specialOffer: "₹1,000 for 3 months (Save ₹50)",
      features: ["6 Hours Study Time", "24/7 Available", "AC Environment", "High-Speed WiFi", "Personal Locker", "Charging Points"],
      popular: true,
      badge: "Special Offer"
    },
    {
      name: "Morning Shift",
      time: "6:00 AM - 11:00 AM",
      price: "₹350/month",
      features: ["AC Environment", "High-Speed WiFi", "Personal Locker", "Charging Points"],
      popular: false
    },
    {
      name: "Afternoon Shift",
      time: "11:00 AM - 4:00 PM",
      price: "₹350/month",
      features: ["AC Environment", "High-Speed WiFi", "Personal Locker", "Charging Points"],
      popular: false
    },
    {
      name: "Evening Shift",
      time: "4:00 PM - 9:00 PM",
      price: "₹350/month",
      features: ["AC Environment", "High-Speed WiFi", "Personal Locker", "Charging Points"],
      popular: false
    },
    {
      name: "Full Day",
      time: "6:00 AM - 9:00 PM",
      price: "₹800/month",
      features: ["All Day Access", "Priority Seating", "All Morning Features", "All Evening Features"],
      popular: false
    }
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/admission/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Application submitted successfully! We will contact you soon.');
        setIsModalOpen(false);
        setFormData({
          name: '',
          phone: '',
          whatsapp: '',
          address: '',
          shift: 'Special 6-Hour',
          joiningDate: ''
        });
      } else {
        toast.error(data.message || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Ambient Cursor Glow Effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), transparent 40%)`
        }}
      />

      {/* Glassmorphism Navbar */}
      <motion.header
        style={{
          opacity: navbarOpacity,
          backdropFilter: `blur(${navbarBlur}px)`
        }}
        className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="relative">
                <BookOpen className="h-10 w-10 text-blue-400" />
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Durga Digital Library
                </h1>
                <p className="text-xs text-slate-400">Modern Learning Environment</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 text-slate-300 hover:text-white font-medium transition-all hover:bg-white/5 rounded-lg"
              >
                Login
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all border border-blue-400/20"
              >
                Apply Online
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section with Dynamic Background */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Background Slider */}
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={slides[currentSlide].image}
              alt={slides[currentSlide].title}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].accent} opacity-80`} />
            <div className="absolute inset-0 bg-slate-900/40" />
          </motion.div>
        </AnimatePresence>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto"
          >
            {/* Floating Badges */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-3 mb-8"
            >
              {highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm font-medium flex items-center space-x-2`}
                >
                  <highlight.icon className="w-4 h-4" />
                  <span>{highlight.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Secondary Navigation */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-4 mb-8"
            >
              <button
                onClick={() => {
                  const facilitiesSection = document.getElementById('facilities');
                  if (facilitiesSection) {
                    facilitiesSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm font-medium hover:bg-white/20 transition-all"
              >
                Facilities
              </button>
              <button
                onClick={() => {
                  const pricingSection = document.getElementById('pricing');
                  if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm font-medium hover:bg-white/20 transition-all"
              >
                Fee Structure
              </button>
              <button
                onClick={() => {
                  const contactSection = document.getElementById('contact');
                  if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm font-medium hover:bg-white/20 transition-all"
              >
                Contact
              </button>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                {slides[currentSlide].title}
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-2xl md:text-3xl text-blue-200 mb-4 font-light"
            >
              {slides[currentSlide].subtitle}
            </motion.p>

            <motion.p
              variants={itemVariants}
              className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto"
            >
              {slides[currentSlide].description}
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all border border-blue-400/30 flex items-center justify-center space-x-2"
              >
                <span>Apply for Online Admission</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Explore Facilities</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Slider Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 right-8 z-10"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-white rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="facilities" className="py-24 relative bg-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900 to-slate-950" />
        </div>

        <div className="relative z-10 container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Premium Facilities
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Experience world-class amenities designed for your academic success
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <div className={`relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="relative z-10 text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="relative z-10 text-slate-400">{feature.description}</p>
                
                <motion.div
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timing & Fee Structure */}
      <section id="pricing" className="py-24 relative bg-slate-950">
        <div className="relative z-10 container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Flexible Plans
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Choose the plan that fits your schedule and budget
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {timingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className={`relative p-6 rounded-2xl border ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-blue-400/30' 
                    : 'bg-slate-900 border-white/5'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 text-sm font-bold rounded-full flex items-center space-x-1">
                      <Star className="w-4 h-4" />
                      <span>{plan.badge}</span>
                    </span>
                  </div>
                )}

                <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-base mb-3 ${plan.popular ? 'text-blue-100' : 'text-slate-400'}`}>
                  {plan.time}
                </p>
                <div className={`text-3xl font-bold mb-4 ${plan.popular ? 'text-white' : 'text-blue-400'}`}>
                  {plan.price}
                </div>

                {plan.specialOffer && (
                  <div className="mb-4 p-3 bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-green-300 font-semibold">
                      🎉 {plan.specialOffer}
                    </p>
                  </div>
                )}

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-green-300' : 'text-blue-400'}`} />
                      <span className={plan.popular ? 'text-white' : 'text-slate-300'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full py-3 rounded-xl font-semibold transition-all text-sm ${
                    plan.popular 
                      ? 'bg-white text-blue-600 hover:bg-blue-50' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/30'
                  }`}
                >
                  Get Started
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
        <div className="absolute inset-0 bg-black/20" />
        
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join hundreds of students achieving their academic goals at Durga Digital Library
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              className="px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all inline-flex items-center space-x-2"
            >
              <span>Apply Now - It's Free!</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-950 border-t border-white/10">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <BookOpen className="h-10 w-10 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Durga Digital Library</h3>
                  <p className="text-sm text-slate-400">Modern Learning Environment</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Your gateway to academic excellence with state-of-the-art facilities and a peaceful study environment.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">Saurav Kumar</p>
                    <p className="text-slate-400 text-sm">Library Manager</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <a href="tel:+917542893960" className="text-slate-300 hover:text-white transition-colors">
                    +91 7542893960
                  </a>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">
                    Near Shiv Mandir, Kalarampur,<br />
                    Munger, Bihar - 811211
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Quick Links</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/login')}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors group w-full text-left"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Login</span>
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors group w-full text-left"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Apply Online</span>
                </button>
                <button 
                  onClick={() => {
                    const facilitiesSection = document.getElementById('facilities');
                    if (facilitiesSection) {
                      facilitiesSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors group w-full text-left"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Facilities</span>
                </button>
                <button 
                  onClick={() => {
                    const pricingSection = document.getElementById('pricing');
                    if (pricingSection) {
                      pricingSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors group w-full text-left"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Fee Structure</span>
                </button>
                <a 
                  href="https://wa.me/917542893960"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>WhatsApp Support</span>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Connect With Us</h3>
              <a
                href="https://wa.me/917542893960"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="font-medium">WhatsApp Us</span>
              </a>

              {/* Google Map Embed */}
              <div className="mt-6 rounded-xl overflow-hidden border border-white/10">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3620.123456789!2d86.123456789!3d25.123456789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDA3JzI0LjQiTiA4NsKwMDcnMjQuNCJF!5e0!3m2!1sen!2sin!4v1234567890"
                  width="100%"
                  height="150"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              &copy; 2024 Durga Digital Library. All rights reserved. Built with ❤️ for students.
            </p>
          </div>
        </div>
      </footer>

      {/* Glassmorphic Admission Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Online Admission</h2>
                    <p className="text-slate-400 text-sm">Fill in your details to get started</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </motion.button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-slate-500"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-slate-500"
                        placeholder="Mobile number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-slate-500"
                        placeholder="WhatsApp number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Address/Village *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-slate-500"
                      placeholder="Enter your address or village"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Preferred Shift *
                      </label>
                      <select
                        name="shift"
                        value={formData.shift}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white"
                      >
                        <option value="Special 6-Hour">Special 6-Hour (10AM-4PM) - ₹350/month</option>
                        <option value="Morning">Morning (6AM-11AM) - ₹350/month</option>
                        <option value="Afternoon">Afternoon (11AM-4PM) - ₹350/month</option>
                        <option value="Evening">Evening (4PM-9PM) - ₹350/month</option>
                        <option value="Full Day">Full Day (6AM-9PM) - ₹800/month</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Joining Date *
                      </label>
                      <input
                        type="date"
                        name="joiningDate"
                        value={formData.joiningDate}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Application</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-800 pt-6">
                  <p>After submission, we'll contact you within 24 hours.</p>
                  <p className="mt-2 flex items-center justify-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Need help? Call Saurav Kumar: +91 7542893960</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;