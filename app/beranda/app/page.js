"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  FiArrowUp,
  FiBarChart2,
  FiCheck,
  FiCloud,
  FiCreditCard,
  FiDollarSign,
  FiFacebook,
  FiHeadphones,
  FiInstagram,
  FiLinkedin,
  FiLock,
  FiMail,
  FiMapPin,
  FiMenu,
  FiMessageCircle,
  FiMoon,
  FiPackage,
  FiPhone,
  FiPrinter,
  FiShield,
  FiShoppingCart,
  FiSmartphone,
  FiSun,
  FiTrendingUp,
  FiTwitter,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import FAQSchema from "./components/FAQSchema";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // ✅ FIX: Move testimonials definition before useEffect that uses it
  // ✅ UPDATED: Testimoni diganti dengan konten yang lebih menarik dan realistis
  // Menggunakan format yang lebih fokus pada manfaat dan fitur, bukan testimoni personal
  const testimonials = [
    {
      name: "Fitur Multi-Outlet",
      position: "Kelola Semua Cabang dari Satu Dashboard",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop",
      text: "Dengan QuickKasir, Anda bisa mengelola semua outlet dari satu dashboard. Pantau penjualan, stok, dan laporan semua cabang secara real-time tanpa perlu bolak-balik lokasi.",
      rating: 5,
    },
    {
      name: "Laporan Real-Time",
      position: "Analisis Bisnis yang Akurat dan Cepat",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop",
      text: "Dapatkan insight bisnis yang akurat dengan laporan real-time. Analisis penjualan, profit margin, produk terlaris, dan tren bisnis untuk pengambilan keputusan yang lebih tepat.",
      rating: 5,
    },
    {
      name: "Manajemen Stok Otomatis",
      position: "Tidak Perlu Khawatir Stok Habis",
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&h=100&fit=crop",
      text: "Sistem notifikasi otomatis memberitahu Anda ketika stok menipis. Kelola inventory dengan mudah, kurangi risiko kehabisan produk, dan optimalkan pengelolaan gudang.",
      rating: 5,
    },
    {
      name: "Integrasi Payment Gateway",
      position: "Terima Pembayaran dengan Mudah",
      image:
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop",
      text: "Terima pembayaran tunai, kartu, QRIS, dan e-wallet dalam satu sistem. Proses transaksi lebih cepat, pelanggan lebih puas, dan bisnis Anda lebih efisien.",
      rating: 5,
    },
    {
      name: "Cloud-Based System",
      position: "Akses dari Mana Saja, Kapan Saja",
      image:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100&h=100&fit=crop",
      text: "Data tersimpan aman di cloud dengan backup otomatis. Akses dari komputer, tablet, atau smartphone. Tidak perlu khawatir kehilangan data atau masalah server.",
      rating: 5,
    },
    {
      name: "Harga Terjangkau",
      position: "Investasi yang Menguntungkan untuk Bisnis",
      image:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=100&h=100&fit=crop",
      text: "Mulai dari Rp 1.500/hari, QuickKasir menawarkan fitur lengkap dengan harga yang sangat terjangkau. ROI tercapai dalam 3 bulan pertama dengan peningkatan efisiensi hingga 70%.",
      rating: 5,
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  // Fetch pricing plans from API
  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        setLoadingPlans(true);
        // Get API URL from environment or use default
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/subscriptions/plans`);
        const result = await response.json();

        if (result.success && result.data) {
          // Transform API data to frontend format
          const transformedPlans = result.data.map((plan) => {
            // Get monthly price (default to first price if no monthly)
            const monthlyPrice =
              plan.prices?.find((p) => p.duration_type === "monthly") ||
              plan.prices?.[0];
            const monthlyPriceValue = monthlyPrice
              ? monthlyPrice.final_price
              : 0;
            // Convert monthly to daily price (divide by 30, but use minimum 1.500 for Basic)
            const dailyPrice =
              monthlyPriceValue > 0 ? Math.round(monthlyPriceValue / 30) : 0;
            // Ensure minimum price of 1.500 for the lowest tier
            const finalPrice =
              dailyPrice > 0 && dailyPrice < 1500 ? 1500 : dailyPrice;
            const formattedPrice = finalPrice.toLocaleString("id-ID");

            // Format features from array or JSON
            let featuresList = [];
            if (Array.isArray(plan.features)) {
              // ✅ FIX: Extract string from object format [{"feature": "..."}]
              featuresList = plan.features
                .map((feature) => {
                  // If feature is an object with 'feature' key (from backend model)
                  if (typeof feature === "object" && feature !== null) {
                    // Priority: feature.feature > feature.name > feature.text > etc
                    return (
                      feature.feature ||
                      feature.name ||
                      feature.text ||
                      feature.title ||
                      feature.description ||
                      String(feature)
                    );
                  }
                  // If feature is already a string, return as is
                  return String(feature);
                })
                .filter((f) => f && f.trim() !== ""); // Remove empty strings
            } else if (typeof plan.features === "string") {
              try {
                const parsed = JSON.parse(plan.features);
                if (Array.isArray(parsed)) {
                  // ✅ FIX: Extract string from object format
                  featuresList = parsed
                    .map((feature) => {
                      if (typeof feature === "object" && feature !== null) {
                        return (
                          feature.feature ||
                          feature.name ||
                          feature.text ||
                          feature.title ||
                          feature.description ||
                          String(feature)
                        );
                      }
                      return String(feature);
                    })
                    .filter((f) => f && f.trim() !== ""); // Remove empty strings
                } else {
                  featuresList = [];
                }
              } catch {
                featuresList = [];
              }
            }

            // ✅ FIX: Remove duplicates
            featuresList = [...new Set(featuresList)];

            // Add default features based on plan capabilities (only if not already exists)
            if (plan.max_outlets > 0) {
              const outletText = `${
                plan.max_outlets === -1 ? "Unlimited" : plan.max_outlets
              } Outlet`;
              if (!featuresList.includes(outletText)) {
                featuresList.unshift(outletText);
              }
            }
            if (plan.max_employees > 0) {
              const userText = `${
                plan.max_employees === -1 ? "Unlimited" : plan.max_employees
              } User`;
              if (!featuresList.includes(userText)) {
                featuresList.push(userText);
              }
            }
            if (plan.has_online_integration) {
              const onlineText = "Integrasi Online";
              if (!featuresList.includes(onlineText)) {
                featuresList.push(onlineText);
              }
            }
            if (plan.has_advanced_reports) {
              const reportsText = "Laporan Advanced";
              if (!featuresList.includes(reportsText)) {
                featuresList.push(reportsText);
              }
            }
            if (plan.has_api_access) {
              const apiText = "API Access";
              if (!featuresList.includes(apiText)) {
                featuresList.push(apiText);
              }
            }

            return {
              id: plan.id,
              name: plan.name,
              slug: plan.slug,
              price: formattedPrice,
              period: "/hari",
              description: plan.description || "",
              features: featuresList,
              popular: plan.is_popular || false,
              cta: plan.cta_text || "Mulai Sekarang",
              originalPlan: plan, // Keep original for reference
            };
          });

          setPricingPlans(transformedPlans);
        }
      } catch (error) {
        console.error("Error fetching pricing plans:", error);
        // Fallback to default plans if API fails
        setPricingPlans([
          {
            name: "Basic",
            price: "1.500",
            period: "/hari",
            description: "Cocok untuk usaha kecil dengan 1 outlet",
            features: [
              "1 Outlet",
              "2 User Kasir",
              "Kelola Produk",
              "Laporan Basic",
              "Support Email",
              "Cloud Storage 5GB",
            ],
            popular: false,
            cta: "Mulai Sekarang",
          },
          {
            name: "Professional",
            price: "4.500",
            period: "/hari",
            description: "Ideal untuk bisnis berkembang",
            features: [
              "5 Outlet",
              "Unlimited User",
              "Kelola Produk",
              "Laporan Advanced",
              "Support Prioritas",
              "Cloud Storage 50GB",
              "Integrasi QRIS",
              "Multi Gudang",
            ],
            popular: true,
            cta: "Paling Populer",
          },
          {
            name: "Enterprise",
            price: "9.000",
            period: "/hari",
            description: "Untuk bisnis skala besar",
            features: [
              "Unlimited Outlet",
              "Unlimited User",
              "Semua Fitur Pro",
              "Laporan Custom",
              "Dedicated Support",
              "Cloud Storage Unlimited",
              "API Access",
              "White Label",
              "Training Gratis",
            ],
            popular: false,
            cta: "Hubungi Kami",
          },
        ]);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPricingPlans();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  // ✅ Redirect ke halaman login di frontend
  const redirectToLogin = () => {
    // Frontend React app di app.quickkasir.com (production) atau localhost:3000 (development)
    const frontendUrl =
      process.env.NEXT_PUBLIC_APP_URL || 
      process.env.NEXT_PUBLIC_FRONTEND_URL || 
      (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'http://app.quickkasir.com');
    window.location.href = `${frontendUrl}/login`;
  };

  const features = [
    {
      icon: <FiShoppingCart className="w-8 h-8" />,
      title: "Multi-Outlet",
      description:
        "Kelola beberapa cabang dalam satu platform terpadu dengan sinkronisasi real-time",
    },
    {
      icon: <FiPackage className="w-8 h-8" />,
      title: "Kelola Produk",
      description:
        "Manajemen produk lengkap dengan kategori, varian, dan gambar produk",
    },
    {
      icon: <FiBarChart2 className="w-8 h-8" />,
      title: "Manajemen Stok",
      description:
        "Pantau stok secara real-time dengan notifikasi otomatis untuk stok menipis",
    },
    {
      icon: <FiTrendingUp className="w-8 h-8" />,
      title: "Laporan Realtime",
      description:
        "Dashboard analitik lengkap dengan laporan penjualan, laba rugi, dan grafik",
    },
    {
      icon: <FiUsers className="w-8 h-8" />,
      title: "Akses Per User",
      description:
        "Atur hak akses kasir dan admin dengan sistem role yang fleksibel",
    },
    {
      icon: <FiLock className="w-8 h-8" />,
      title: "Keamanan Data",
      description:
        "Enkripsi data tingkat enterprise dengan backup otomatis setiap hari",
    },
    {
      icon: <FiCloud className="w-8 h-8" />,
      title: "Cloud Backup",
      description:
        "Data tersimpan aman di cloud dengan akses dari mana saja, kapan saja",
    },
    {
      icon: <FiHeadphones className="w-8 h-8" />,
      title: "Support 24/7",
      description:
        "Tim support siap membantu Anda kapan saja via chat, telepon, atau email",
    },
  ];

  const whyChooseUs = [
    {
      icon: <FiZap className="w-6 h-6" />,
      title: "Mudah Digunakan",
      description: "Interface intuitif yang bisa dipelajari dalam 5 menit",
    },
    {
      icon: <FiTrendingUp className="w-6 h-6" />,
      title: "Super Cepat",
      description: "Proses transaksi dalam hitungan detik",
    },
    {
      icon: <FiDollarSign className="w-6 h-6" />,
      title: "Harga Terjangkau",
      description: "Investasi yang menguntungkan untuk bisnis Anda",
    },
    {
      icon: <FiUsers className="w-6 h-6" />,
      title: "Dipercaya UMKM",
      description: "Mulai dari 1.500+ bisnis yang sudah bergabung",
    },
    {
      icon: <FiShield className="w-6 h-6" />,
      title: "Hemat Waktu",
      description: "Otomasi proses bisnis hingga 70%",
    },
    {
      icon: <FiCloud className="w-6 h-6" />,
      title: "Hemat Biaya",
      description: "ROI tercapai dalam 3 bulan pertama",
    },
  ];

  const faqs = [
    // ✅ SEO: Keyword-focused FAQs untuk Google Suggest
    {
      question: "Apa itu POS kasir online?",
      answer:
        "POS kasir online adalah sistem point of sale berbasis cloud yang memungkinkan Anda mengelola transaksi penjualan secara online. QuickKasir adalah aplikasi POS kasir online terbaik untuk UMKM yang menyediakan fitur lengkap seperti manajemen stok, laporan penjualan, multi-outlet, dan integrasi payment gateway seperti QRIS. Dengan POS kasir online, Anda bisa mengelola bisnis dari mana saja, kapan saja.",
    },
    {
      question: "Berapa harga POS kasir online untuk UMKM?",
      answer:
        "Harga POS kasir online QuickKasir untuk UMKM dimulai dari Rp 1.500/hari untuk paket Basic (1 outlet, 2 user). Paket Professional seharga Rp 4.500/hari (5 outlet, unlimited user) dan paket Enterprise Rp 9.000/hari (unlimited outlet). Semua paket termasuk free trial 14 hari tanpa kartu kredit. Harga POS kasir online kami sangat terjangkau dibandingkan dengan sistem POS tradisional yang memerlukan investasi besar di awal.",
    },
    {
      question: "POS kasir online UMKM mana yang terbaik?",
      answer:
        "QuickKasir adalah POS kasir online terbaik untuk UMKM karena dirancang khusus untuk kebutuhan bisnis kecil dan menengah. Fitur unggulan termasuk: multi-outlet management, real-time inventory, laporan penjualan lengkap, integrasi QRIS, mode offline, dan support 24/7. QuickKasir juga mudah digunakan, tidak memerlukan instalasi kompleks, dan bisa diakses dari berbagai perangkat (komputer, tablet, smartphone).",
    },
    {
      question: "Apakah QuickKasir POS cocok untuk multi-cabang?",
      answer:
        "Ya, sangat cocok! QuickKasir dirancang khusus untuk mendukung bisnis multi-cabang dengan sinkronisasi data real-time antar outlet. Anda bisa mengelola semua cabang dari satu dashboard pusat. Sistem POS kasir online kami memungkinkan Anda memantau penjualan, stok, dan laporan dari semua outlet secara bersamaan.",
    },
    {
      question: "Apakah data transaksi saya aman di POS kasir online?",
      answer:
        "Keamanan data adalah prioritas kami. Kami menggunakan enkripsi tingkat enterprise (SSL/TLS), backup otomatis harian, dan server di data center tersertifikasi ISO 27001. Data Anda dijamin aman. POS kasir online QuickKasir menggunakan teknologi cloud terpercaya dengan sistem keamanan berlapis untuk melindungi data transaksi dan informasi bisnis Anda.",
    },
    {
      question: "Bagaimana cara upgrade ke paket yang lebih tinggi?",
      answer:
        "Sangat mudah! Anda bisa upgrade kapan saja melalui dashboard Anda. Cukup pilih paket yang diinginkan, dan sistem akan otomatis mengaktifkan fitur tambahan. Tidak ada downtime. Upgrade paket POS kasir online QuickKasir bisa dilakukan dalam hitungan menit tanpa kehilangan data.",
    },
    {
      question: "Apakah ada biaya setup atau instalasi untuk POS kasir online?",
      answer:
        "Tidak ada biaya setup! Anda hanya membayar biaya langganan bulanan sesuai paket yang dipilih. Untuk paket Enterprise, kami bahkan memberikan training gratis untuk tim Anda. POS kasir online QuickKasir tidak memerlukan instalasi software kompleks - cukup daftar dan mulai gunakan langsung melalui browser.",
    },
    {
      question: "Apakah POS kasir online bisa digunakan offline?",
      answer:
        "Ya! QuickKasir memiliki mode offline untuk kasir, jadi transaksi tetap berjalan meskipun internet terputus. Data akan otomatis sinkronisasi saat koneksi kembali normal. Fitur ini sangat penting untuk POS kasir online karena memastikan bisnis Anda tetap berjalan meskipun ada masalah koneksi internet.",
    },
    {
      question:
        "Perangkat apa saja yang bisa digunakan untuk POS kasir online?",
      answer:
        "QuickKasir bisa digunakan di komputer, laptop, tablet, dan smartphone. Kompatibel dengan Windows, Mac, Android, dan iOS. Cukup akses melalui browser atau download aplikasi mobile kami. POS kasir online QuickKasir fleksibel dan bisa digunakan di berbagai perangkat sesuai kebutuhan bisnis Anda.",
    },
    {
      question: "Apakah ada trial gratis untuk POS kasir online?",
      answer:
        "Ya! Kami menyediakan free trial 14 hari dengan akses penuh ke semua fitur Professional. Tidak perlu kartu kredit untuk memulai trial. Coba POS kasir online QuickKasir secara gratis dan rasakan kemudahan mengelola bisnis dengan sistem modern.",
    },
    {
      question:
        "Bagaimana dengan integrasi printer dan perangkat lain untuk POS kasir online?",
      answer:
        "QuickKasir mendukung berbagai printer thermal, barcode scanner, cash drawer, dan payment gateway seperti QRIS. Tim kami siap membantu proses integrasi perangkat Anda. POS kasir online kami kompatibel dengan perangkat POS standar yang biasa digunakan di toko dan restoran.",
    },
    {
      question: "Apakah bisa custom laporan sesuai kebutuhan bisnis saya?",
      answer:
        "Ya, untuk paket Enterprise kami menyediakan layanan custom report. Aplikasi QuickKasir sudah dilengkapi dengan berbagai template laporan siap pakai (penjualan, produk, kasir, pelanggan, stok, pajak, dll) yang bisa Anda akses langsung. Jika Anda membutuhkan laporan khusus dengan format atau data spesifik yang belum tersedia, tim support kami akan membantu membuat custom report sesuai kebutuhan bisnis Anda. Hubungi tim support untuk konsultasi kebutuhan laporan custom Anda.",
    },
    {
      question: "Bagaimana cara batalkan langganan POS kasir online?",
      answer:
        "Anda bebas batalkan kapan saja tanpa penalty. Cukup hubungi tim support kami minimal 7 hari sebelum periode billing berikutnya. Data Anda akan tetap tersimpan selama 30 hari setelah pembatalan. Tidak ada kontrak jangka panjang - fleksibilitas penuh untuk bisnis UMKM.",
    },
  ];

  const integrations = [
    {
      icon: <FiCreditCard className="w-8 h-8" />,
      name: "QRIS",
      description: "Pembayaran digital",
    },
    {
      icon: <FiPrinter className="w-8 h-8" />,
      name: "Thermal Printer",
      description: "Print struk otomatis",
    },
    {
      icon: <FiSmartphone className="w-8 h-8" />,
      name: "Mobile App",
      description: "Android & iOS",
    },
    {
      icon: <FiCreditCard className="w-8 h-8" />,
      name: "EDC Machine",
      description: "Debit & Credit Card",
    },
  ];

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark" : ""}`}>
      <div className="bg-background text-foreground transition-colors duration-300">
        {/* Navbar */}
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <motion.div
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
              >
                <Image
                  src="/logo-qk.png"
                  alt="QuickKasir Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling.style.display = "flex";
                  }}
                />
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-slate-700 rounded-lg flex items-center justify-center hidden">
                  <FiShoppingCart className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-slate-800 bg-clip-text text-transparent">
                  QuickKasir
                </span>
              </motion.div>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-8">
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Fitur
                </button>
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Harga
                </button>
                {/* <button
                  onClick={() => scrollToSection("demo")}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Demo
                </button> */}
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Kontak
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  {theme === "light" ? (
                    <FiMoon className="w-5 h-5" />
                  ) : (
                    <FiSun className="w-5 h-5" />
                  )}
                </button>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-emerald-600 to-slate-700 hover:from-emerald-500 hover:to-slate-600 active:from-emerald-700 active:to-slate-800 transition-all duration-300"
                    onClick={redirectToLogin}
                  >
                    Coba Gratis
                  </Button>
                </motion.div>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  {theme === "light" ? (
                    <FiMoon className="w-5 h-5" />
                  ) : (
                    <FiSun className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2"
                >
                  {mobileMenuOpen ? (
                    <FiX className="w-6 h-6" />
                  ) : (
                    <FiMenu className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:hidden py-4 space-y-4"
              >
                <button
                  onClick={() => scrollToSection("features")}
                  className="block w-full text-left py-2 hover:text-primary transition-colors"
                >
                  Fitur
                </button>
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="block w-full text-left py-2 hover:text-primary transition-colors"
                >
                  Harga
                </button>
                {/* <button
                  onClick={() => scrollToSection("demo")}
                  className="block w-full text-left py-2 hover:text-primary transition-colors"
                >
                  Demo
                </button> */}
                <button
                  onClick={() => scrollToSection("contact")}
                  className="block w-full text-left py-2 hover:text-primary transition-colors"
                >
                  Kontak
                </button>
                <Button
                  className="w-full bg-gradient-to-r from-emerald-600 to-navy-700 hover:from-emerald-700 hover:to-navy-800"
                  onClick={redirectToLogin}
                >
                  Coba Gratis
                </Button>
              </motion.div>
            )}
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-background overflow-hidden">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Badge className="mb-4 bg-gradient-to-r from-emerald-100 to-amber-100 text-slate-800 dark:from-emerald-900/30 dark:to-amber-900/30 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800">
                  🚀 Solusi POS Modern #1 di Indonesia
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-emerald-600 to-slate-800 bg-clip-text text-transparent">
                    POS Kasir Online UMKM
                  </span>{" "}
                  Terbaik untuk Bisnis Anda
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  <strong>QuickKasir</strong> adalah aplikasi{" "}
                  <strong>POS kasir online</strong> modern berbasis cloud yang
                  dirancang khusus untuk <strong>UMKM</strong>. Kelola
                  transaksi, stok, dan laporan dalam satu platform.{" "}
                  <strong>Harga POS kasir online</strong> kami terjangkau mulai
                  dari Rp 1.500/hari. Tingkatkan efisiensi bisnis hingga 70%
                  dengan otomasi cerdas.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-slate-700 hover:from-emerald-500 hover:to-slate-600 active:from-emerald-700 active:to-slate-800 text-white shadow-lg shadow-emerald-500/50 hover:shadow-emerald-400/60 transition-all duration-300"
                      onClick={redirectToLogin}
                    >
                      Coba Gratis 14 Hari
                    </Button>
                  </motion.div>
                  {/* <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => scrollToSection("demo")}
                    >
                      Lihat Demo
                    </Button>
                  </motion.div> */}
                </div>
                <div className="mt-8 flex items-center space-x-6">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      1.500+
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Bisnis Aktif
                    </div>
                  </div>
                  <div className="w-px h-12 bg-border"></div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      99.9%
                    </div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div className="w-px h-12 bg-border"></div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      24/7
                    </div>
                    <div className="text-sm text-muted-foreground">Support</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1658282653150-67e2023a67e3"
                    alt="QuickKasir POS Dashboard"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
                </div>
                {/* Floating Cards */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <FiTrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Penjualan Hari Ini
                      </div>
                      <div className="text-lg font-bold">Rp 45.8jt</div>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                  className="absolute -bottom-4 -right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                      <FiUsers className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Transaksi
                      </div>
                      <div className="text-lg font-bold">234</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-background">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4">Fitur Lengkap</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Semua yang Anda Butuhkan dalam Satu Platform
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                QuickKasir dilengkapi fitur-fitur canggih yang dirancang khusus
                untuk meningkatkan efisiensi bisnis Anda
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                >
                  <Card className="h-full hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 border-2 hover:border-emerald-400 dark:hover:border-emerald-500 group">
                    <CardHeader>
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-slate-700 group-hover:from-emerald-400 group-hover:to-slate-600 rounded-lg flex items-center justify-center text-white mb-4 transition-all duration-300">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-emerald-50 dark:to-gray-900">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4">Keunggulan Kami</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Kenapa Memilih QuickKasir POS?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Bergabunglah dengan ribuan bisnis yang sudah merasakan
                manfaatnya
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {whyChooseUs.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-600 mb-2">
                    1.500+
                  </div>
                  <div className="text-muted-foreground">Bisnis Aktif</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-600 mb-2">
                    50,000+
                  </div>
                  <div className="text-muted-foreground">
                    Transaksi per Hari
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-600 mb-2">
                    99.9%
                  </div>
                  <div className="text-muted-foreground">
                    Customer Satisfaction
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-600 mb-2">
                    24/7
                  </div>
                  <div className="text-muted-foreground">Support Available</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 bg-background">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4">Paket Harga</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pilih Paket yang Sesuai dengan Bisnis Anda
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Harga transparan, tanpa biaya tersembunyi. Upgrade atau
                downgrade kapan saja
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {loadingPlans ? (
                // Loading skeleton
                [1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <Card className="h-full">
                      <CardHeader className="text-center pb-8 pt-8">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto mb-4"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[1, 2, 3, 4].map((j) => (
                          <div
                            key={j}
                            className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                          ></div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))
              ) : pricingPlans.length === 0 ? (
                <div className="col-span-3 text-center py-12">
                  <p className="text-muted-foreground">
                    Tidak ada paket tersedia saat ini.
                  </p>
                </div>
              ) : (
                pricingPlans.map((plan, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                  >
                    <Card
                      className={`h-full relative overflow-hidden transition-all duration-300 ${
                        plan.popular
                          ? "border-2 border-emerald-500 dark:border-emerald-400 shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-400/30 hover:scale-[1.02]"
                          : "hover:border-emerald-300 dark:hover:border-emerald-700"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 text-sm font-semibold shadow-lg">
                          ⭐ Paling Populer
                        </div>
                      )}
                      <CardHeader className="text-center pb-8 pt-8">
                        <CardTitle className="text-2xl mb-2">
                          {plan.name}
                        </CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                        <div className="mt-4">
                          <span className="text-4xl font-bold">
                            Rp {plan.price}
                          </span>
                          <span className="text-muted-foreground">
                            {plan.period}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {plan.features &&
                        Array.isArray(plan.features) &&
                        plan.features.length > 0 ? (
                          plan.features
                            .map((feature, i) => {
                              // ✅ FIX: Ensure feature is always a string before rendering
                              // Handle both object format {"feature": "..."} and plain string
                              let featureText = "";
                              if (
                                typeof feature === "object" &&
                                feature !== null
                              ) {
                                featureText =
                                  feature.feature ||
                                  feature.name ||
                                  feature.text ||
                                  feature.title ||
                                  feature.description ||
                                  "";
                              } else {
                                featureText = String(feature || "");
                              }

                              // Skip if empty
                              if (!featureText || featureText.trim() === "") {
                                return null;
                              }

                              return (
                                <div
                                  key={i}
                                  className="flex items-center space-x-2"
                                >
                                  <FiCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                                  <span className="text-sm">{featureText}</span>
                                </div>
                              );
                            })
                            .filter(Boolean) // Remove null entries
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Tidak ada fitur tersedia
                          </p>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button
                          className={`w-full transition-all duration-300 ${
                            plan.popular
                              ? "bg-gradient-to-r from-emerald-600 to-slate-700 hover:from-emerald-500 hover:to-slate-600 active:from-emerald-700 active:to-slate-800 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40"
                              : "hover:border-emerald-400 dark:hover:border-emerald-500"
                          }`}
                          variant={plan.popular ? "default" : "outline"}
                          onClick={redirectToLogin}
                        >
                          {plan.cta}
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-emerald-50 dark:to-gray-900">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4">Keunggulan Fitur</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Fitur-Fitur Unggulan QuickKasir
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Temukan bagaimana QuickKasir membantu mengoptimalkan operasional
                bisnis Anda
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-white dark:bg-gray-800 shadow-xl">
                  <CardContent className="pt-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                      <Image
                        src={testimonials[currentTestimonial].image}
                        alt={testimonials[currentTestimonial].name}
                        width={100}
                        height={100}
                        className="rounded-full"
                      />
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex justify-center md:justify-start mb-2">
                          {[
                            ...Array(testimonials[currentTestimonial].rating),
                          ].map((_, i) => (
                            <span key={i} className="text-yellow-400 text-xl">
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-lg mb-4 italic">
                          "{testimonials[currentTestimonial].text}"
                        </p>
                        <div>
                          <div className="font-semibold">
                            {testimonials[currentTestimonial].name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {testimonials[currentTestimonial].position}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Testimonial Navigation */}
              <div className="flex justify-center mt-8 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      currentTestimonial === index
                        ? "bg-emerald-500 dark:bg-emerald-400 w-8 shadow-lg shadow-emerald-500/50"
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-emerald-300 dark:hover:bg-emerald-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* All Testimonials Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.name}
                          width={50}
                          height={50}
                          className="rounded-full"
                        />
                        <div>
                          <div className="font-semibold text-sm">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testimonial.position}
                          </div>
                        </div>
                      </div>
                      <div className="flex mb-2">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-400">
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "{testimonial.text}"
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Integration Section */}
        <section className="py-20 px-4 bg-background">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4">Integrasi</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Terintegrasi dengan Berbagai Perangkat & Payment
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                QuickKasir mendukung berbagai metode pembayaran dan perangkat
                untuk kemudahan bisnis Anda
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {integrations.map((integration, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Card className="text-center hover:shadow-lg transition-all">
                    <CardContent className="pt-6">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:scale-110 transition-all duration-300">
                        {integration.icon}
                      </div>
                      <h3 className="font-semibold mb-1">{integration.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {integration.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Video Section */}
        {/* <section
          id="demo"
          className="py-20 px-4 bg-gradient-to-b from-background to-emerald-50 dark:to-gray-900"
        >
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <Badge className="mb-4">Demo</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Lihat QuickKasir dalam Aksi
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Tonton video demo singkat untuk melihat betapa mudahnya
                menggunakan QuickKasir
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 aspect-video">
                <Image
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf"
                  alt="Demo Video Thumbnail"
                  fill
                  className="object-cover opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-emerald-500 dark:border-l-emerald-400 border-b-[12px] border-b-transparent ml-1"></div>
                  </motion.button>
                </div>
              </div>
              <div className="text-center mt-8">
                <Button size="lg" variant="outline">
                  Lihat Demo Lengkap
                </Button>
              </div>
            </motion.div>
          </div>
        </section> */}

        {/* FAQ Section */}
        <section className="py-20 px-4 bg-background">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge className="mb-4">FAQ</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pertanyaan yang Sering Diajukan
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Temukan jawaban untuk pertanyaan umum tentang QuickKasir
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto"
            >
              {/* ✅ SEO: FAQ Schema untuk Google Rich Snippets & Suggest */}
              <FAQSchema faqs={faqs} />

              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border rounded-lg px-6"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-semibold">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-slate-800 dark:from-emerald-700 dark:via-slate-800 dark:to-slate-900 text-white">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Mulai Kelola Bisnis Anda Dengan Lebih Mudah Mulai Hari Ini!
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Bergabunglah dengan 1.500+ bisnis yang sudah berkembang bersama
                QuickKasir. Coba gratis selama 14 hari, tanpa kartu kredit!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 active:bg-gray-100 text-lg px-8 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={redirectToLogin}
                  >
                    Mulai Gratis Sekarang
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 border-2 border-emerald-400 hover:border-emerald-500 text-lg px-8 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => {
                      // Bisa diarahkan ke WhatsApp atau email
                      window.open("https://wa.me/6282197060927", "_blank");
                    }}
                  >
                    Hubungi Sales
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="bg-gray-900 text-gray-300 py-16 px-4">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              {/* Company Info */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Image
                    src="/logo-qk.png"
                    alt="QuickKasir Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling.style.display = "flex";
                    }}
                  />
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-slate-700 rounded-lg flex items-center justify-center hidden">
                    <FiShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">
                    QuickKasir
                  </span>
                </div>
                <p className="text-sm mb-4">
                  Solusi POS modern untuk semua jenis bisnis. Tingkatkan
                  efisiensi dan produktivitas dengan teknologi terkini.
                </p>
                <div className="flex space-x-3">
                  <a
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:scale-110 active:bg-emerald-600 transition-all duration-300"
                  >
                    <FiFacebook className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:scale-110 active:bg-emerald-600 transition-all duration-300"
                  >
                    <FiTwitter className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:scale-110 active:bg-emerald-600 transition-all duration-300"
                  >
                    <FiInstagram className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:scale-110 active:bg-emerald-600 transition-all duration-300"
                  >
                    <FiLinkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="text-white font-semibold mb-4">Produk</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Fitur
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Harga
                    </a>
                  </li>
                  {/* <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Demo
                    </a>
                  </li> */}
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Integrasi
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Mobile App
                    </a>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-white font-semibold mb-4">Sumber Daya</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Panduan
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Dokumentasi
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Video Tutorial
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Webinar
                    </a>
                  </li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-white font-semibold mb-4">Kontak</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center space-x-2">
                    <FiPhone className="w-4 h-4" />
                    <span>+62 821-9706-0927</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <FiMail className="w-4 h-4" />
                    <span>quickkasir@gmail.com</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <FiMapPin className="w-4 h-4" />
                    <span>Indonesia</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <p className="text-sm">
                  © 2025 QuickKasir. All rights reserved.
                </p>
                <div className="flex space-x-6 text-sm">
                  <a href="#" className="hover:text-white transition-colors">
                    Kebijakan Privasi
                  </a>
                  <a href="#" className="hover:text-white transition-colors">
                    Syarat & Ketentuan
                  </a>
                  <a href="#" className="hover:text-white transition-colors">
                    Cookie Policy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating WhatsApp Button */}
        <motion.a
          href="https://wa.me/6282197060927"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-green-600 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 }}
        >
          <FiMessageCircle className="w-6 h-6" />
        </motion.a>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <motion.button
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 z-50 w-12 h-12 bg-emerald-600 dark:bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-emerald-500 dark:hover:bg-emerald-400 hover:scale-110 active:scale-95 transition-all duration-300"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
