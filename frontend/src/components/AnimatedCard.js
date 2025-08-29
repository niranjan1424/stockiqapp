import React from 'react';
import PropTypes from 'prop-types';
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

const AnimatedCard = React.forwardRef(({ className, children, ...props }, ref) => (
    <Card
        ref={ref}
        className={cn("bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5", className)}
        {...props}
    >
        {children}
    </Card>
));

AnimatedCard.displayName = "AnimatedCard";
AnimatedCard.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export default AnimatedCard;