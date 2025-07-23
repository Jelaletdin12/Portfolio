"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github, Play } from "lucide-react";
import Image from "next/image";

const ProjectsSection = () => {
  

  const projects = [
    {
      id: 1,
      title: "MM Electroincs - E-Commerce Platform",
      description: "A fully responsive front-end for a modern e-commerce platform, built with performance and scalability in mind.",
      image: "./MM.png",
      technologies: ["React", "SCSS", "Ant Design", "Redux Toolkit", "Vite"],
      category: "E-commerce",
      featured: true,
      links: {
        live: "https://mm.com.tm",
       github: "Private Repository",
        demo: "https://mm.com.tm"
      },
      stats: {
        users: "10K+",
        uptime: "99.9%",
        performance: "95"
      }
    },
    {
      id: 2,
      title: "The Like&Love Project – NFT-Powered Passive Crypto Mining",
      description: "A decentralized mining platform where users earn LIKE and LOVE tokens via NFTs without using device resources.",
      image: "/token.png",
      technologies: ["React", "Ant Design", "SCSS"],
      category: "Landing Website",
      featured: true,
      links: {
        live: "https://site.tonlike.com/",
        github: "Private Repository",
      },
      stats: {
        accuracy: "94%",
        dataPoints: "1M+",
        speed: "2.3s"
      }
    },
    {
      id: 3,
      title: "AR Group Official Website",
      description: "The official website of AR Group. Provides general information about the company, contact details and information about sales points.",
      image: "/ar.png",
      technologies: ["Vue.js", "CSS", "Django" ],
      category: "Landing Website",
      featured: true,
      links: {
        live: "http://argroup.com.tm/",
        github: "https://github.com"
      }
    },
    {
      id: 4,
      title: "Sanly.pro Official website",
      description: "A modern, responsive website for Sanly.pro, showcasing their services and portfolio with a focus on user experience and performance.",
      image: "/sanly.png",
      technologies: ["Vue.js", "Animation"],
      category: "Landing Website",
      featured: true,
      links: {
        live: "https://sanly-pro.vercel.app/",
        github: "https://github.com"
      }
    },
    {
      id: 5,
      title: "Jussplay Official website",
      description: "A secure, transparent voting platform built on blockchain technology ensuring election integrity and voter privacy.",
      image: "/jussplay.png",
      technologies: ["React", "SCSS", "GSAP"],
      category: "Landing Website",
      featured: false,
      links: {
        github: "https://github.com",
        demo: "https://jussplay.dev"
      }
    },
    {
      id: 6,
      title: "SkySystem - e-commerce platfrom",
      description: "An IoT-based home automation system with voice control, energy monitoring, and intelligent scheduling.",
      image: "/sky.png",
      technologies: ["React", "Tanstack query", "SCSS"],
      category: "E-commerce",
      featured: false,
      links: {
        github: "https://github.com"
      }
    },
    {
      id: 7,
      title: "Telegram app",
      description: "An IoT-based home automation system with voice control, energy monitoring, and intelligent scheduling.",
      image: "/tg.jpg",
      technologies: ["React", "Framer Motion", "Tailwind"],
      category: "Telegram",
      featured: false,
      links: {
        github: "https://github.com"
      }
    },
    {
      id: 8,
      title: "Inventory and Task manager - test project",
      description: "An IoT-based home automation system with voice control, energy monitoring, and intelligent scheduling.",
      image: "/invent.jpg",
      technologies: ["SCSS", "Ant Design", "React"],
      category: "IoT",
      featured: false,
      links: {
        github: "https://github.com"
      }
    }
  ];

  const categories = ["All", "E-commer", "Landing Website", "Telegram"];

  return (
    <section id="projects" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-72 h-72 bg-luxury-gold/10 rounded-full blur-3xl" />
      </div>

      <div className="section-padding">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Featured <span className="text-gradient">Projects</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A showcase of innovative solutions that demonstrate technical excellence and creative problem-solving.
            </p>
          </motion.div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-2 mb-16"
          >
            {categories.map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Button
                  variant={index === 0 ? "default" : "outline"}
                  className={`${
                    index === 0 
                      ? "luxury-gradient text-black" 
                      : "border-luxury-gold/30 text-foreground hover:border-luxury-gold hover:bg-luxury-gold/10"
                  } transition-all duration-300`}
                >
                  {category}
                </Button>
              </motion.div>
            ))}
          </motion.div>

          {/* Featured Projects */}
          <div className="mb-16">
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-2xl font-semibold mb-8 text-luxury-gold"
            >
              Featured Work
            </motion.h3>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {projects.filter(p => p.featured).map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-card border-luxury-gold/20 hover:border-luxury-gold/40 transition-all duration-300 overflow-hidden group">
                    <div className="relative overflow-hidden">
                      <Image
                        src={project.image}
                        alt={project.title}
                        width={600}
                        height={400}
                        className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-4">
                        {project.links.live && (
                          <Button size="sm" className="luxury-gradient text-black">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Live Demo
                          </Button>
                        )}
                        {project.links.github && (
                          <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Github className="w-4 h-4 mr-2" />
                            Code
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xl font-semibold">{project.title}</h4>
                          <Badge variant="outline" className="border-luxury-gold/30 text-luxury-gold">
                            {project.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {project.description}
                        </p>
                      </div>

                      {project.stats && (
                        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                          {Object.entries(project.stats).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className="text-lg font-bold text-luxury-gold">{value}</div>
                              <div className="text-xs text-muted-foreground capitalize">{key}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech, techIndex) => (
                          <motion.div
                            key={tech}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: techIndex * 0.05 }}
                            viewport={{ once: true }}
                          >
                            <Badge variant="secondary" className="text-xs bg-luxury-gold/10 text-luxury-gold">
                              {tech}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Other Projects */}
          <div>
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-2xl font-semibold mb-8"
            >
              More Projects
            </motion.h3>
            
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
              {projects.filter(p => !p.featured).map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="glass-card border-luxury-gold/20 hover:border-luxury-gold/40 transition-all duration-300 group h-full">
                    <div className="relative overflow-hidden">
                      <Image
                        src={project.image}
                        alt={project.title}
                        width={400}
                        height={250}
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{project.title}</h4>
                          <Badge variant="outline" className="border-luxury-gold/30 text-luxury-gold text-xs">
                            {project.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {project.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {project.technologies.slice(0, 3).map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs bg-luxury-gold/10 text-luxury-gold">
                            {tech}
                          </Badge>
                        ))}
                        {project.technologies.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{project.technologies.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {project.links.github && (
                          <Button size="sm" variant="outline" className="flex-1 text-xs">
                            <Github className="w-3 h-3 mr-1" />
                            Code
                          </Button>
                        )}
                        {project.links.live && (
                          <Button size="sm" className="flex-1 text-xs luxury-gradient text-black">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Live
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <h3 className="text-2xl font-semibold mb-4">Interested in Working Together?</h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              I'm always open to discussing new opportunities and exciting projects. Let's create something amazing together.
            </p>
            <Button className="luxury-gradient text-black font-semibold px-8 py-6 text-lg hover:shadow-2xl hover:shadow-luxury-gold/25 transition-all duration-300">
              Get in Touch
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;