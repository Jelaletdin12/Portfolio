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
  Twitter,
  Calendar,
  Clock,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

const ContactSection = () => {
  console.log("ContactSection component rendered");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Contact form submitted");
    // You would implement actual form submission here
    toast.success("Message sent! I'll get back to you soon.");
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "jcarymuhammedow@gmail.com",
      link: "mailto:jcarymuhammedow@gmail.com"
    },
    {
      icon: Phone,
      title: "Phone",
      value: "+993 61097651",
      link: "tel:+99361097651"
    },
    {
      icon: MapPin,
      title: "Location",
      value: "Ashgabat, Ahal, Turkmenistan",
      link: "https://www.google.com/maps/place/A%C5%9Fkabat,+T%C3%BCrkmenistan/@37.9633633,58.0854729,41836m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3f6ffe1bab3684d9:0x3cde013f62d3ade9!8m2!3d37.9600766!4d58.3260629!16zL20vMGZtc3g?entry=ttu&g_ep=EgoyMDI1MDcwOS4wIKXMDSoASAFQAw%3D%3D"
    }
  ];

  const socialLinks = [
    {
      icon: Github,
      name: "GitHub",
      url: "https://github.com/Jelaletdin12/Jelaletdin12",
      color: "hover:text-gray-400"
    },
    {
      icon: Linkedin,
      name: "LinkedIn",
      url: "https://linkedin.com/in/jelaletdin-çarymuhammedow-2b26a92b8",
      color: "hover:text-blue-400"
    },
    {
      icon: Send,
      name: "Twitter",
      url: "https://t.me/Jelaletdin_Ch",
      color: "hover:text-blue-400"
    }
  ];

  const availability = [
    { icon: Calendar, text: "Available for new projects" },
    { icon: Clock, text: "Usually responds within 24 hours" },
    { icon: Globe, text: "Open to remote collaboration" }
  ];

  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-muted/30">
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
              Ready to bring your next project to life? I'd love to hear about your ideas and discuss how we can work together.
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
                <h3 className="text-2xl font-semibold mb-6 text-luxury-gold">Get in Touch</h3>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  I'm always excited to take on new challenges and collaborate with amazing people. 
                  Whether you have a project in mind or just want to chat about technology, feel free to reach out!
                </p>
                
                {/* Contact Details */}
                <div className="space-y-4">
                  {contactInfo.map((item, index) => (
                    <motion.a
                      key={item.title}
                      href={item.link}
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
                        <div className="text-muted-foreground">{item.value}</div>
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
                  <h3 className="text-2xl font-semibold mb-6">Send Me a Message</h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          className="bg-background/50 border-luxury-gold/20 focus:border-luxury-gold"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          className="bg-background/50 border-luxury-gold/20 focus:border-luxury-gold"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        className="bg-background/50 border-luxury-gold/20 focus:border-luxury-gold"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Project Discussion"
                        className="bg-background/50 border-luxury-gold/20 focus:border-luxury-gold"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell me about your project..."
                        rows={6}
                        className="bg-background/50 border-luxury-gold/20 focus:border-luxury-gold resize-none"
                        required
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full luxury-gradient text-black font-semibold py-6 text-lg hover:shadow-2xl hover:shadow-luxury-gold/25 transition-all duration-300"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-20"
          >
            <Card className="glass-card border-luxury-gold/20 p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-semibold mb-4">Ready to Start Your Project?</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                From concept to deployment, I'll help you build something extraordinary. 
                Let's discuss your vision and turn it into reality.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="luxury-gradient text-black font-semibold px-8 py-3">
                  Schedule a Call
                </Button>
                <Button variant="outline" className="border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10 px-8 py-3">
                  View My Work
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;