"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Wand2,
  MonitorPlay,
  MoveRight,
  Palette,
  Layers,
} from "lucide-react";

const SkillsSection = () => {
  const skillCategories = [
    {
      icon: Code2,
      title: "Frontend Development",
      color: "from-blue-500 to-cyan-500",
      skills: [
        { name: "React", level: 95 },
        { name: "Vue.js", level: 90 },
        { name: "JavaScript / TypeScript", level: 92 },
        { name: "Tailwind / SCSS", level: 90 },
      ],
    },
    {
      icon: Wand2,
      title: "Creative Animation",
      color: "from-pink-500 to-purple-500",
      skills: [
        { name: "GSAP", level: 92 },
        { name: "Framer Motion", level: 88 },
        { name: "Custom Cursor & Scroll FX", level: 90 },
        { name: "SVG & Lottie", level: 80 },
      ],
    },
    {
      icon: MonitorPlay,
      title: "3D & Interaction",
      color: "from-orange-500 to-yellow-500",
      skills: [
        { name: "Three.js", level: 85 },
        { name: "Shader Effects", level: 75 },
        { name: "Interactive Canvas UI", level: 82 },
        { name: "Performance Optimization", level: 88 },
      ],
    },
    {
      icon: Palette,
      title: "UI / UX & Design",
      color: "from-teal-500 to-emerald-500",
      skills: [
        { name: "Responsive Design", level: 95 },
        { name: "Figma to Code", level: 90 },
        { name: "Micro-interactions", level: 85 },
        { name: "Design Systems", level: 80 },
      ],
    },
  ];

  const technologies = [
    { name: "React", category: "Library" },
    { name: "Vue.js", category: "Framework" },
    { name: "GSAP", category: "Animation" },
    { name: "Three.js", category: "3D" },
    { name: "Framer Motion", category: "Animation" },
    { name: "Tailwind CSS", category: "Styling" },
    { name: "SCSS Modules", category: "Styling" },
    { name: "Vite", category: "Tooling" },
    { name: "TypeScript", category: "Language" },
    { name: "Axios", category: "HTTP" },
  ];

  const tools = [
    "VS Code",
    "Figma",
    "Postman",
    "Git / GitHub",
    "Vite",
    "Vercel",
    "Netlify",
    "Chrome DevTools",
    "Notion",
    "Linear",
  ];

  return (
    <section id="skills" className="py-24 relative overflow-hidden bg-muted/30">
      {/* Background visuals */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-0 w-72 h-72 bg-luxury-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              What I <span className="text-gradient">Do Best</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              I craft high-performance, visually engaging web experiences using modern tools, frameworks, and animation libraries.
            </p>
          </motion.div>

          {/* Skill cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {skillCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-card border-luxury-gold/20 hover:border-luxury-gold/40 transition-all duration-300 h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center mr-4`}>
                        <category.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold">{category.title}</h3>
                    </div>

                    <div className="space-y-4">
                      {category.skills.map((skill, i) => (
                        <motion.div
                          key={skill.name}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: (index * 0.1) + (i * 0.05) }}
                          viewport={{ once: true }}
                          className="space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{skill.name}</span>
                            <span className="text-sm text-muted-foreground">{skill.level}%</span>
                          </div>
                          <Progress value={skill.level} className="h-2 bg-muted" />
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Technologies */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h3 className="text-2xl font-semibold text-center mb-8">Core Technologies</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {technologies.map((tech, index) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="group"
                >
                  <Badge
                    variant="secondary"
                    className="px-4 py-2 text-sm bg-luxury-gold/10 text-luxury-gold border-luxury-gold/20 hover:bg-luxury-gold/20 transition-all duration-300 cursor-default"
                  >
                    {tech.name}
                    <span className="ml-2 text-xs opacity-60">{tech.category}</span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tools */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-semibold text-center mb-8">Daily Tools</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {tools.map((tool, index) => (
                <motion.div
                  key={tool}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <Badge
                    variant="outline"
                    className="px-4 py-2 text-sm border-luxury-gold/30 text-foreground hover:border-luxury-gold hover:bg-luxury-gold/10 transition-all duration-300 cursor-default"
                  >
                    {tool}
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

export default SkillsSection;
