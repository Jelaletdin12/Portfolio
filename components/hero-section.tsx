"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Download,
  ArrowDown,
  Github,
  Linkedin,
  Mail,
  Send,
} from "lucide-react";
import NeuralNoise from "./neural-noise";
import NeuralNetworkVisual from "./neural-network-visual";

const HeroSection = () => {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDownloadCV = () => {
    const link = document.createElement("a");
    link.href = "/Charymuhammedow.pdf"; // public klasöründeki dosya yolu
    link.download = "Jelaletdin_Charymuhammedov_CV.pdf"; // indirme ismi
    link.click();
  };

  const socialLinks = [
    {
      icon: Github,
      href: "https://github.com/Jelaletdin12/Jelaletdin12",
      label: "GitHub",
    },
    {
      icon: Linkedin,
      // "ç" karakteri percent-encode edildi
      href: "https://linkedin.com/in/jelaletdin-%C3%A7arymuhammedow-2b26a92b8",
      label: "LinkedIn",
    },
    // "mailto:" sonrasındaki boşluk kaldırıldı
    { icon: Mail, href: "mailto:jcarymuhammedow@gmail.com", label: "Email" },
    { icon: Send, href: "https://t.me/Jelaletdin_Ch", label: "Telegram" },
  ];

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
    >
      <NeuralNoise />

      <div className="section-padding w-full pt-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-luxury-gold font-medium text-lg"
              >
                Hello, I'm
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-[34px] md:text-6xl font-bold leading-tight"
              >
                <span className="text-gradient">Jelaletdin</span>
                <br />
                <span className="text-foreground">Charymuhammedov</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-xl text-muted-foreground max-w-lg leading-relaxed"
              >
                Crafting exceptional digital experiences with precision,
                creativity, and a passion for cutting-edge technology.
              </motion.p>
            </div>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex space-x-4"
            >
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-3 glass-card rounded-full hover:glow-effect transition-all duration-300"
                >
                  <social.icon className="w-5 h-5 text-luxury-gold" />
                </motion.a>
              ))}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                onClick={handleDownloadCV}
                className="luxury-gradient text-black font-semibold px-8 py-6 text-lg hover:shadow-2xl hover:shadow-luxury-gold/25 transition-all duration-300"
              >
                <Download className="mr-2 h-5 w-5" />
                Download CV
              </Button>

              <Button
                variant="outline"
                onClick={() => scrollToSection("#projects")}
                className="px-8 py-6 text-lg border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-black transition-all duration-300"
              >
                View Projects
              </Button>
            </motion.div>
          </motion.div>

          {/* Neural network animation (eski avatarın yerine) */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <NeuralNetworkVisual />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.button
            onClick={() => scrollToSection("#about")}
            aria-label="Scroll to about section"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2 rounded-full glass-card hover:glow-effect transition-all duration-300"
          >
            <ArrowDown className="w-6 h-6 text-luxury-gold" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;