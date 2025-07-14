"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Palette, Rocket, Users } from "lucide-react";

const AboutSection = () => {
  console.log("AboutSection component rendered");

  const highlights = [
    {
      icon: Code,
      title: "Clean Code",
      description:
        "Writing maintainable, scalable, and efficient code with best practices.",
    },
    {
      icon: Palette,
      title: "Design Focus",
      description:
        "Creating beautiful, user-centered interfaces with attention to detail.",
    },
    {
      icon: Rocket,
      title: "Performance",
      description:
        "Optimizing applications for speed, accessibility, and user experience.",
    },
    {
      icon: Users,
      title: "Collaboration",
      description:
        "Working effectively with teams to deliver exceptional results.",
    },
  ];

  const stats = [
    { number: "50+", label: "Projects Completed" },
    { number: "3+", label: "Years Experience" },
    { number: "15+", label: "Technologies" },
    { number: "100%", label: "Client Satisfaction" },
  ];

  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl" />
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
              About <span className="text-gradient">Me</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              I'm a passionate frontend developer dedicated to creating digital
              experiences that combine beautiful design with powerful
              functionality.
            </p>
          </motion.div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            {/* Story */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-semibold text-luxury-gold">
                My Story
              </h3>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  My journey in software development began with a passion for
                  designing intuitive user interfaces and creating engaging
                  digital experiences. Over the years, I've specialized in
                  building responsive, pixel-perfect frontends using modern web
                  technologies to deliver seamless and performant user
                  experiences.
                </p>
                <p>
                  I believe that great software is born from the intersection of
                  technical excellence and human-centered design. Every project
                  I undertake is an opportunity to push boundaries and create
                  something truly exceptional.
                </p>
                <p>
                  When I'm not coding, you'll find me exploring new
                  technologies, contributing to open-source projects, or sharing
                  knowledge with the developer community.
                </p>
              </div>
            </motion.div>

            {/* Highlights Grid */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {highlights.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-card border-luxury-gold/20 hover:border-luxury-gold/40 transition-all duration-300 h-full">
                    <CardContent className="p-6 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto bg-luxury-gradient rounded-xl flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-black" />
                      </div>
                      <h4 className="font-semibold text-lg">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Values */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <h3 className="text-2xl font-semibold mb-8">Core Values</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "Innovation",
                "Quality",
                "Collaboration",
                "Continuous Learning",
                "User Experience",
                "Performance",
                "Accessibility",
                "Open Source",
              ].map((value, index) => (
                <motion.div
                  key={value}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Badge
                    variant="secondary"
                    className="px-4 py-2 text-sm bg-luxury-gold/10 text-luxury-gold border-luxury-gold/20 hover:bg-luxury-gold/20 transition-all duration-300"
                  >
                    {value}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
