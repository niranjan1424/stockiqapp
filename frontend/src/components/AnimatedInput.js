import React from 'react';
import PropTypes from 'prop-types';
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

const AnimatedInput = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg blur opacity-0 group-focus-within:opacity-75 transition duration-1000 group-focus-within:duration-200 animate-tilt"></div>
            <Input
                ref={ref}
                className={cn("relative", className)}
                {...props}
            />
        </div>
    );
});

AnimatedInput.displayName = "AnimatedInput";
AnimatedInput.propTypes = {
    className: PropTypes.string,
};

export default AnimatedInput;