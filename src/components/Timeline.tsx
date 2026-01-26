"use client";

import { motion } from "framer-motion";

interface TimelineItem {
    year: string;
    event: string;
    role: string;
}

interface TimelineProps {
    items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
    return (
        <div className="relative max-w-4xl mx-auto py-8">
            {/* Vertical Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[rgb(var(--line)/0.2)] hidden md:block -translate-x-1/2" />
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[rgb(var(--line)/0.2)] md:hidden" />

            {/* Timeline Items */}
            <div className="space-y-16 md:space-y-24">
                {items.map((item, index) => {
                    const isLeft = index % 2 === 0;
                    const isCurrent = index === 0;

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="relative"
                        >
                            {/* Desktop Layout: Alternating */}
                            <div className="hidden md:grid md:grid-cols-2 md:gap-16 items-center">
                                {/* Left Content */}
                                <div className={`${isLeft ? "text-right pr-8" : "order-2 pl-8"}`}>
                                    <motion.div
                                        whileHover={{ x: isLeft ? -4 : 4 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="text-xs uppercase tracking-[0.2em] font-medium opacity-40 mb-2">
                                            {item.year}
                                        </div>
                                        <h3 className="font-serif text-xl md:text-2xl font-medium mb-2 leading-tight">
                                            {item.event}
                                        </h3>
                                        <div className="text-sm opacity-60 leading-relaxed">
                                            {item.role}
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Dot */}
                                <div className={`absolute left-1/2 -translate-x-1/2 ${isLeft ? "" : "order-1"}`}>
                                    <div
                                        className={`w-3 h-3 rounded-full border-2 transition-colors duration-300 ${isCurrent
                                                ? "bg-[rgb(var(--accent))] border-[rgb(var(--accent))]"
                                                : "bg-[rgb(var(--bg))] border-[rgb(var(--line))]"
                                            }`}
                                        style={{
                                            boxShadow: isCurrent ? "0 0 0 4px rgba(60, 200, 120, 0.1)" : "none",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Mobile Layout: Single Column */}
                            <div className="md:hidden flex items-start gap-6 pl-12 relative">
                                {/* Dot */}
                                <div className="absolute left-6 -translate-x-1/2">
                                    <div
                                        className={`w-3 h-3 rounded-full border-2 transition-colors duration-300 ${isCurrent
                                                ? "bg-[rgb(var(--accent))] border-[rgb(var(--accent))]"
                                                : "bg-[rgb(var(--bg))] border-[rgb(var(--line))]"
                                            }`}
                                        style={{
                                            boxShadow: isCurrent ? "0 0 0 4px rgba(60, 200, 120, 0.1)" : "none",
                                        }}
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="text-xs uppercase tracking-[0.2em] font-medium opacity-40 mb-2">
                                        {item.year}
                                    </div>
                                    <h3 className="font-serif text-lg font-medium mb-2 leading-tight">
                                        {item.event}
                                    </h3>
                                    <div className="text-sm opacity-60 leading-relaxed">
                                        {item.role}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
