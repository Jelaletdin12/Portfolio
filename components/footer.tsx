"use client";

import { motion } from "framer-motion";
import { Github, Linkedin, Twitter, Mail, Heart, ArrowUp, BrainIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  console.log("Footer component rendered");

  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    console.log("Scroll to top clicked");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const footerLinks = {
    navigation: [
      { name: "Home", href: "#home" },
      { name: "About", href: "#about" },
      { name: "Skills", href: "#skills" },
      { name: "Projects", href: "#projects" },
      { name: "Contact", href: "#contact" },
    ],
    social: [
      { name: "GitHub", href: "https://github.com/Jelaletdin12/Jelaletdin12", icon: Github },
      { name: "LinkedIn", href: "https://linkedin.com/in/jelaletdin-çarymuhammedow-2b26a92b8", icon: Linkedin },
      { name: "Telegram",href: "https://t.me/Jelaletdin_Ch", icon: Send },
      { name: "Email", href: "mailto:jcarymuhammedow@gmail.com", icon: Mail },
    ]
  };

  const scrollToSection = (href: string) => {
    console.log("Footer navigation clicked:", href);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="relative bg-muted/50 border-t border-luxury-gold/20">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="section-padding py-16">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="md:col-span-2"
            >
              <div className="text-2xl font-bold text-gradient mb-4">Portfolio</div>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
                Crafting exceptional digital experiences with precision, creativity, and a passion for cutting-edge technology.
              </p>
              <div className="flex space-x-4">
                {footerLinks.social.map((social, index) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="p-2 glass-card rounded-lg hover:border-luxury-gold/40 transition-all duration-300"
                  >
                    <social.icon className="w-5 h-5 text-luxury-gold" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <nav className="space-y-2">
                {footerLinks.navigation.map((link, index) => (
                  <motion.button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="block text-muted-foreground hover:text-luxury-gold transition-colors duration-200"
                  >
                    {link.name}
                  </motion.button>
                ))}
              </nav>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold text-lg mb-4">Get in Touch</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>jcarymuhammedow@gmail.com</p>
                <p>+993 61097651</p>
                <p>Ashgabat, Ahal, Turkmenistan</p>
              </div>
              <Button
                onClick={() => scrollToSection("#contact")}
                className="mt-4 luxury-gradient text-black font-semibold hover:shadow-lg hover:shadow-luxury-gold/25 transition-all duration-300"
              >
                Start a Project
              </Button>
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="border-t border-luxury-gold/20 mb-8"
          />

          {/* Bottom Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
          >
            <div className="text-muted-foreground text-sm flex items-center">
              © {currentYear} Portfolio. Made with{" "}
              {/* <Heart className="w-4 h-4 mx-1 text-luxury-gold fill-current" /> */}
              <BrainIcon className="w-4 h-4 mx-1 text-luxury-gold "/>
              by Jelaletdin Charymuhammedov
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <button 
                onClick={() => scrollToSection("#home")}
                className="hover:text-luxury-gold transition-colors duration-200"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button 
                onClick={() => scrollToSection("#home")}
                className="hover:text-luxury-gold transition-colors duration-200"
              >
                Terms of Service
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <motion.button
        onClick={scrollToTop}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 p-3 luxury-gradient rounded-full shadow-lg hover:shadow-2xl hover:shadow-luxury-gold/25 transition-all duration-300 z-40"
      >
        <ArrowUp className="w-5 h-5 text-black" />
      </motion.button>
    </footer>
  );
};

export default Footer;