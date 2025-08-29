import React from 'react';
import PropTypes from 'prop-types';
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const GlowButton = React.forwardRef(({ className, children, ...props }, ref) => (
    <Button
        ref={ref}
        className={cn(
            "relative inline-flex items-center justify-center rounded-full border border-transparent bg-indigo-600 px-6 py-2 text-base font-medium text-white shadow-lg transition-all duration-300 hover:bg-indigo-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
            "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-indigo-500 before:opacity-0 before:blur-lg before:transition-all before:duration-300 hover:before:opacity-50 hover:before:scale-110",
            className
        )}
        {...props}
    >
        {children}
    </Button>
));

GlowButton.displayName = "GlowButton";
GlowButton.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export default GlowButton;