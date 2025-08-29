import PropTypes from "prop-types";
import { cn } from "../../lib/utils";
import { Slot } from "@radix-ui/react-slot";

const getVariantStyles = (variant) => {
  switch (variant) {
    case "destructive":
      return "bg-red-600 text-white hover:bg-red-700";
    case "outline":
      return "border border-gray-300 text-gray-900 hover:bg-gray-100";
    case "secondary":
      return "bg-gray-100 text-gray-900 hover:bg-gray-200";
    case "ghost":
      return "bg-transparent hover:bg-gray-100";
    case "link":
      return "text-blue-600 underline hover:text-blue-800";
    default:
      return "bg-blue-600 text-white hover:bg-blue-700";
  }
};

const getSizeStyles = (size) => {
  switch (size) {
    case "sm":
      return "h-8 px-3 text-sm";
    case "lg":
      return "h-12 px-6 text-lg";
    case "icon":
      return "h-10 w-10 p-0";
    default:
      return "h-10 px-4 text-base";
  }
};

const Button = ({ className, variant, size, asChild = false, ...props }) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        getVariantStyles(variant),
        getSizeStyles(size),
        className
      )}
      {...props}
    />
  );
};

Button.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(["default", "destructive", "outline", "secondary", "ghost", "link"]),
  size: PropTypes.oneOf(["default", "sm", "lg", "icon"]),
  asChild: PropTypes.bool,
};

export { Button };
