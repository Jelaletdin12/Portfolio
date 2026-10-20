export interface Project {
  name: string;
  sub?: string;
  desc: string;
  tech: string[];
  live?: string;
}

export interface Stop {
  /** short label under the timeline dot */
  label: string;
  /** landmark name shown on the map pin */
  place: string;
  title: string;
  lede: string;
  /** keys of PROJECTS shown in this district */
  ids?: number[];
  /** last stop: call to action instead of a project list */
  cta?: boolean;
  /** city block (grid units) that holds the landmark */
  cell: [number, number];
  /** pin height above the ground, world units */
  pinY: number;
}

export const EMAIL = "jcarymuhammedow@gmail.com";

const DESC_ECOM =
  "A fully responsive front-end for a modern e-commerce platform, built with performance and scalability in mind.";

export const PROJECTS: Record<number, Project> = {
  1: { name: "MM Electronics", sub: "E-Commerce Platform", desc: DESC_ECOM, tech: ["React", "SCSS", "Ant Design", "Redux Toolkit", "Vite"], live: "https://mm.com.tm" },
  2: { name: "Postshop", sub: "E-Commerce Platform", desc: DESC_ECOM, tech: ["Next.js", "Tailwind", "Shadcn UI", "TypeScript", "Turbopack"], live: "https://shop.post.tm" },
  3: { name: "Smart Elektronika", sub: "E-Commerce Platform", desc: DESC_ECOM, tech: ["Next.js", "Tailwind", "Shadcn UI", "TypeScript", "Turbopack"], live: "https://smartelektronika.com/" },
  4: { name: "The Like&Love Project", desc: "A decentralized mining platform where users earn LIKE and LOVE tokens via NFTs without using device resources.", tech: ["React", "Ant Design", "SCSS"], live: "https://site.tonlike.com/" },
  5: { name: "AR Group", sub: "Official Website", desc: "The official website of AR Group. Provides general information about the company, contact details and information about sales points.", tech: ["Vue.js", "CSS", "Django"], live: "http://argroup.com.tm/" },
  6: { name: "Sanly.pro", sub: "Official Website", desc: "A modern, responsive website for Sanly.pro, showcasing their services and portfolio with a focus on user experience and performance.", tech: ["Vue.js", "Animation"], live: "https://sanly-pro.vercel.app/" },
  7: { name: "Jussplay", desc: "A secure, transparent voting platform built on blockchain technology ensuring election integrity and voter privacy.", tech: ["React", "SCSS", "GSAP"] },
  8: { name: "SkySystem", desc: "E-commerce platform for tech products with user-friendly interface, secure payments, and efficient order management.", tech: ["React", "Tanstack query", "SCSS"] },
  9: { name: "Telegram app", desc: "Telegram bet webapp. Users can place bets on various bet game events and win coins.", tech: ["React", "Framer Motion", "Tailwind"] },
  10: { name: "Management System", desc: "Inventory and Task Management System", tech: ["SCSS", "Ant Design", "React"] },
  11: { name: "Tmcars", sub: "Automotive & Marketplace Platform", desc: "Turkmenistan's leading automotive and marketplace web application, built with a heavy focus on high traffic, fast data rendering, and smooth user experience.", tech: ["React", "Next.js", "Tailwind CSS", "Zustand", "REST API"], live: "https://tmcars.info/" },
  12: { name: "Tmcars News", sub: "Content & Media Platform", desc: "A dynamic, SEO-optimized news and editorial portal engineered for seamless content delivery, multi-language/category support, and high performance.", tech: ["React", "Next.js", "Tailwind CSS"], live: "https://news.tmcars.info/tm/posts/habarlar" },
  13: { name: "App for Artist", desc: "An intuitive dashboard and management portal designed for artists to upload music, manage track metadata, monitor streaming analytics, and control profile content.", tech: ["React", "Vite", "Zustand", "Tailwind CSS", "REST API"], live: "https://artist.aydym.com/" },
  14: { name: "Elyeter Marketplace", desc: "Elyeter is a modern e-commerce platform built with Next.js and Nest js. It features a user-friendly interface, secure payment processing, and efficient order management.", tech: ["Next.js", "Nest.js", "Tailwind CSS", "Zustand", "REST API"] },
  15: { name: "TBP Bank Dashboard", desc: "An intuitive dashboard and management portal for TBP Bank", tech: ["React", "Vite", "Tanstack Query", "Zustand", "shadcn", "Tailwind CSS", "REST API"] },
};

/** One district per project group, in driving order. `cell` positions are tuned to the route in createCity.ts. */
export const STOPS: Stop[] = [
  { label: "E-commerce", place: "Storefront row", title: "E-commerce", lede: "Responsive storefronts built for performance and scale.", ids: [1, 2, 3, 8, 14], cell: [-2.5, 1.5], pinY: 6.6 },
  { label: "Marketplace", place: "Car lot", title: "Marketplace & media", lede: "A high-traffic automotive marketplace and its SEO-focused news portal.", ids: [11, 12], cell: [0.5, -0.5], pinY: 5.4 },
  { label: "Dashboards", place: "Bank", title: "Dashboards", lede: "Management portals for banking and for artists.", ids: [15, 13], cell: [3.5, -1.5], pinY: 9 },
  { label: "Landing", place: "Billboard", title: "Landing websites", lede: "Company and product sites built around speed and motion.", ids: [4, 5, 6, 7], cell: [5.5, -1.5], pinY: 11.4 },
  { label: "Telegram", place: "Signal tower", title: "Telegram & experiments", lede: "A Telegram web app and an inventory management system.", ids: [9, 10], cell: [6.5, -0.5], pinY: 21 },
  { label: "Contact", place: "Post office", title: "Interested in working together?", lede: "I'm always open to discussing new opportunities and exciting projects. Let's create something amazing together.", cta: true, cell: [7.5, 0.5], pinY: 8.2 },
];
