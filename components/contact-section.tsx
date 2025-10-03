"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Github,
  Linkedin,
  Calendar,
  Clock,
  Globe,
  AlertCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";

// ============================================
// GÜVENLIK KONFİGÜRASYONU
// ============================================
const SECURITY_CONFIG = {
  // Rate limiting
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_WINDOW: 60000, // 1 dakika
  COOLDOWN_PERIOD: 300000, // 5 dakika

  // Input validation
  MAX_NAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 100,
  MAX_SUBJECT_LENGTH: 150,
  MAX_MESSAGE_LENGTH: 2000,
  MIN_MESSAGE_LENGTH: 10,

  // Spam detection patterns
  SPAM_PATTERNS: [
    /\b(viagra|cialis|pharmacy|casino|lottery|winner)\b/gi,
    /\b(click here|buy now|limited time|act now)\b/gi,
    /(http[s]?:\/\/){2,}/gi, // Multiple URLs
    /(.)\1{10,}/gi, // Repeated characters
  ],

  // Suspicious email patterns
  SUSPICIOUS_EMAIL_PATTERNS: [
    /@(tempmail|guerrillamail|10minutemail|throwaway)/i,
    /\+.*\+/g, // Multiple + signs
  ],
};

// ============================================
// GÜVENLIK YARDıMCı FONKSİYONLAR
// ============================================

// XSS koruması - HTML ve script etiketlerini temizle
const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
};

// SQL Injection koruması
const detectSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\bSELECT\b|\bUNION\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  ];
  return sqlPatterns.some((pattern) => pattern.test(input));
};

// Email validasyonu (RFC 5322 compliant)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= SECURITY_CONFIG.MAX_EMAIL_LENGTH;
};

// Telefon numarası validasyonu
const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
};

// Spam detection
const detectSpam = (content: string): boolean => {
  return SECURITY_CONFIG.SPAM_PATTERNS.some((pattern) => pattern.test(content));
};

// Şüpheli email adresi kontrolü
const isSuspiciousEmail = (email: string): boolean => {
  return SECURITY_CONFIG.SUSPICIOUS_EMAIL_PATTERNS.some((pattern) =>
    pattern.test(email)
  );
};

// Rate limiting için local storage helper
const getRateLimitData = () => {
  try {
    const data = localStorage.getItem("contact_form_attempts");
    return data ? JSON.parse(data) : { count: 0, timestamp: Date.now() };
  } catch {
    return { count: 0, timestamp: Date.now() };
  }
};

const setRateLimitData = (count: number, timestamp: number) => {
  try {
    localStorage.setItem(
      "contact_form_attempts",
      JSON.stringify({ count, timestamp })
    );
  } catch {
    // Silent fail for privacy mode
  }
};

// ============================================
// ANA COMPONENT
// ============================================

const ContactSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitTimestampRef = useRef<number>(0);

  // Email.js konfigürasyonu
  const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  // ============================================
  // RATE LIMITING KONTROLÜ
  // ============================================
  const checkRateLimit = (): boolean => {
    const { count, timestamp } = getRateLimitData();
    const now = Date.now();
    const timeDiff = now - timestamp;

    // Cooldown period kontrolü
    if (count >= SECURITY_CONFIG.MAX_ATTEMPTS && timeDiff < SECURITY_CONFIG.COOLDOWN_PERIOD) {
      const remainingTime = Math.ceil((SECURITY_CONFIG.COOLDOWN_PERIOD - timeDiff) / 60000);
      toast.error(`Too many attempts. Please wait ${remainingTime} minutes.`, {
        icon: <Shield className="w-5 h-5" />,
      });
      setIsBlocked(true);
      return false;
    }

    // Rate limit window kontrolü
    if (timeDiff < SECURITY_CONFIG.RATE_LIMIT_WINDOW) {
      if (count >= SECURITY_CONFIG.MAX_ATTEMPTS) {
        setRateLimitData(count + 1, timestamp);
        toast.error("Too many attempts. Please slow down.");
        return false;
      }
      setRateLimitData(count + 1, timestamp);
    } else {
      // Yeni window başlat
      setRateLimitData(1, now);
    }

    setIsBlocked(false);
    return true;
  };

  // ============================================
  // HONEYPOT ALAN (Bot detection)
  // ============================================
  const checkHoneypot = (formData: FormData): boolean => {
    const honeypot = formData.get("website");
    if (honeypot && honeypot !== "") {
      console.warn("Bot detected via honeypot");
      return false;
    }
    return true;
  };

  // ============================================
  // FORM VALIDATION
  // ============================================
  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};
    
    const firstName = sanitizeInput(formData.get("firstName") as string);
    const lastName = sanitizeInput(formData.get("lastName") as string);
    const email = sanitizeInput(formData.get("email") as string);
    const subject = sanitizeInput(formData.get("subject") as string);
    const message = sanitizeInput(formData.get("message") as string);

    // First Name validation
    if (!firstName || firstName.length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    } else if (firstName.length > SECURITY_CONFIG.MAX_NAME_LENGTH) {
      newErrors.firstName = `First name must be less than ${SECURITY_CONFIG.MAX_NAME_LENGTH} characters`;
    } else if (!/^[a-zA-Z\s-']+$/.test(firstName)) {
      newErrors.firstName = "First name contains invalid characters";
    }

    // Last Name validation
    if (!lastName || lastName.length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    } else if (lastName.length > SECURITY_CONFIG.MAX_NAME_LENGTH) {
      newErrors.lastName = `Last name must be less than ${SECURITY_CONFIG.MAX_NAME_LENGTH} characters`;
    } else if (!/^[a-zA-Z\s-']+$/.test(lastName)) {
      newErrors.lastName = "Last name contains invalid characters";
    }

    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (isSuspiciousEmail(email)) {
      newErrors.email = "Please use a permanent email address";
    }

    // Subject validation
    if (!subject || subject.length < 3) {
      newErrors.subject = "Subject must be at least 3 characters";
    } else if (subject.length > SECURITY_CONFIG.MAX_SUBJECT_LENGTH) {
      newErrors.subject = `Subject must be less than ${SECURITY_CONFIG.MAX_SUBJECT_LENGTH} characters`;
    }

    // Message validation
    if (!message || message.length < SECURITY_CONFIG.MIN_MESSAGE_LENGTH) {
      newErrors.message = `Message must be at least ${SECURITY_CONFIG.MIN_MESSAGE_LENGTH} characters`;
    } else if (message.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
      newErrors.message = `Message must be less than ${SECURITY_CONFIG.MAX_MESSAGE_LENGTH} characters`;
    }

    // SQL Injection detection
    const allInputs = [firstName, lastName, email, subject, message].join(" ");
    if (detectSQLInjection(allInputs)) {
      toast.error("Suspicious input detected. Please check your message.", {
        icon: <AlertCircle className="w-5 h-5" />,
      });
      return false;
    }

    // Spam detection
    if (detectSpam(message) || detectSpam(subject)) {
      newErrors.message = "Your message appears to be spam. Please revise it.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================
  // FORM SUBMIT HANDLER
  // ============================================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Çok hızlı submit engelleme (bot protection)
    const now = Date.now();
    if (now - submitTimestampRef.current < 2000) {
      toast.error("Please wait a moment before submitting.");
      return;
    }
    submitTimestampRef.current = now;

    // Rate limiting kontrolü
    if (!checkRateLimit()) {
      return;
    }

    // Email.js ayarları kontrolü
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      toast.error("Email configuration is missing. Please contact me directly.", {
        description: "jcarymuhammedow@gmail.com",
      });
      console.error("Missing Email.js configuration");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot kontrolü
    if (!checkHoneypot(formData)) {
      // Silent fail for bots
      toast.success("Message sent successfully!");
      form.reset();
      return;
    }

    // Form validation
    if (!validateForm(formData)) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsSubmitting(true);

    // Sanitize tüm inputlar
    const templateParams = {
      from_name: sanitizeInput(formData.get("firstName") as string),
      from_lastname: sanitizeInput(formData.get("lastName") as string),
      from_email: sanitizeInput(formData.get("email") as string),
      subject: sanitizeInput(formData.get("subject") as string),
      message: sanitizeInput(formData.get("message") as string),
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent.substring(0, 100), // Limit for security
    };

    try {
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log("Email sent successfully:", response.status);
      toast.success("Message sent successfully! I'll get back to you soon.", {
        description: "Usually responds within 24 hours",
      });
      form.reset();
      setErrors({});
    } catch (error) {
      console.error("Email sending failed:", error);
      toast.error("Failed to send message. Please try again later.", {
        description: "Or contact me directly at jcarymuhammedow@gmail.com",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // CONTACT INFO & SOCIAL LINKS
  // ============================================
  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "jcarymuhammedow@gmail.com",
      link: "mailto:jcarymuhammedow@gmail.com",
    },
    {
      icon: Phone,
      title: "Phone",
      value: "+993 61097651",
      link: "tel:+99361097651",
    },
    {
      icon: MapPin,
      title: "Location",
      value: "Ashgabat, Ahal, Turkmenistan",
      link: "https://www.google.com/maps/place/A%C5%9Fkabat,+T%C3%BCrkmenistan/@37.9633633,58.0854729,41836m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3f6ffe1bab3684d9:0x3cde013f62d3ade9!8m2!3d37.9600766!4d58.3260629!16zL20vMGZtc3g?entry=ttu&g_ep=EgoyMDI1MDcwOS4wIKXMDSoASAFQAw%3D%3D",
    },
  ];

  const socialLinks = [
    {
      icon: Github,
      name: "GitHub",
      url: "https://github.com/Jelaletdin12/Jelaletdin12",
      color: "hover:text-gray-400",
    },
    {
      icon: Linkedin,
      name: "LinkedIn",
      url: "https://linkedin.com/in/jelaletdin-çarymuhammedow-2b26a92b8",
      color: "hover:text-blue-400",
    },
    {
      icon: Send,
      name: "Telegram",
      url: "https://t.me/Jelaletdin_Ch",
      color: "hover:text-blue-400",
    },
  ];

  const availability = [
    { icon: Calendar, text: "Available for new projects" },
    { icon: Clock, text: "Usually responds within 24 hours" },
    { icon: Globe, text: "Open to remote collaboration" },
  ];

  return (
    <section
      id="contact"
      className="py-24 relative overflow-hidden bg-muted/30"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-luxury-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-luxury-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Let's <span className="text-gradient">Connect</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Ready to bring your next project to life? I'd love to hear about
              your ideas and discuss how we can work together.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-luxury-gold">
                  Get in Touch
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  I'm always excited to take on new challenges and collaborate
                  with amazing people. Whether you have a project in mind or
                  just want to chat about technology, feel free to reach out!
                </p>

                {/* Contact Details */}
                <div className="space-y-4">
                  {contactInfo.map((item, index) => (
                    <motion.a
                      key={item.title}
                      href={item.link}
                      target={item.link.startsWith('http') ? "_blank" : undefined}
                      rel={item.link.startsWith('http') ? "noopener noreferrer" : undefined}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center space-x-4 p-4 glass-card rounded-lg hover:border-luxury-gold/40 transition-all duration-300 group"
                    >
                      <div className="w-12 h-12 bg-luxury-gradient rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <item.icon className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-muted-foreground">
                          {item.value}
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Availability</h4>
                <div className="space-y-3">
                  {availability.map((item, index) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center space-x-3"
                    >
                      <item.icon className="w-5 h-5 text-luxury-gold" />
                      <span className="text-muted-foreground">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Follow Me</h4>
                <div className="flex space-x-4">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.1, y: -2 }}
                      className={`p-3 glass-card rounded-full transition-all duration-300 ${social.color}`}
                      aria-label={social.name}
                    >
                      <social.icon className="w-5 h-5" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="glass-card border-luxury-gold/20">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold">
                      Send Me a Message
                    </h3>
                    <Shield className="w-5 h-5 text-luxury-gold"  />
                  </div>

                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    {/* Honeypot field - hidden from users */}
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      style={{
                        position: "absolute",
                        left: "-9999px",
                        width: "1px",
                        height: "1px",
                      }}
                      aria-hidden="true"
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          maxLength={SECURITY_CONFIG.MAX_NAME_LENGTH}
                          className={`bg-background/50 border-luxury-gold/20 focus:border-luxury-gold ${
                            errors.firstName ? "border-red-500" : ""
                          }`}
                          required
                          disabled={isSubmitting || isBlocked}
                          aria-invalid={!!errors.firstName}
                          aria-describedby={errors.firstName ? "firstName-error" : undefined}
                        />
                        {errors.firstName && (
                          <p id="firstName-error" className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          maxLength={SECURITY_CONFIG.MAX_NAME_LENGTH}
                          className={`bg-background/50 border-luxury-gold/20 focus:border-luxury-gold ${
                            errors.lastName ? "border-red-500" : ""
                          }`}
                          required
                          disabled={isSubmitting || isBlocked}
                          aria-invalid={!!errors.lastName}
                          aria-describedby={errors.lastName ? "lastName-error" : undefined}
                        />
                        {errors.lastName && (
                          <p id="lastName-error" className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        maxLength={SECURITY_CONFIG.MAX_EMAIL_LENGTH}
                        className={`bg-background/50 border-luxury-gold/20 focus:border-luxury-gold ${
                          errors.email ? "border-red-500" : ""
                        }`}
                        required
                        disabled={isSubmitting || isBlocked}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                      {errors.email && (
                        <p id="email-error" className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder="Project Discussion"
                        maxLength={SECURITY_CONFIG.MAX_SUBJECT_LENGTH}
                        className={`bg-background/50 border-luxury-gold/20 focus:border-luxury-gold ${
                          errors.subject ? "border-red-500" : ""
                        }`}
                        required
                        disabled={isSubmitting || isBlocked}
                        aria-invalid={!!errors.subject}
                        aria-describedby={errors.subject ? "subject-error" : undefined}
                      />
                      {errors.subject && (
                        <p id="subject-error" className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.subject}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell me about your project..."
                        rows={6}
                        maxLength={SECURITY_CONFIG.MAX_MESSAGE_LENGTH}
                        className={`bg-background/50 border-luxury-gold/20 focus:border-luxury-gold resize-none ${
                          errors.message ? "border-red-500" : ""
                        }`}
                        required
                        disabled={isSubmitting || isBlocked}
                        aria-invalid={!!errors.message}
                        aria-describedby={errors.message ? "message-error" : undefined}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {errors.message && (
                            <span id="message-error" className="text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.message}
                            </span>
                          )}
                        </span>
                        <span>Max {SECURITY_CONFIG.MAX_MESSAGE_LENGTH} characters</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full luxury-gradient text-black font-semibold py-6 text-lg hover:shadow-2xl hover:shadow-luxury-gold/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting || isBlocked}
                    >
                      <Send className="mr-2 h-5 w-5" />
                      {isSubmitting ? "Sending..." : isBlocked ? "Blocked" : "Send Message"}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Your information is protected and will never be shared.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;