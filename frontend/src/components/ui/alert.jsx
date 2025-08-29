import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const getVariantStyles = (variant) => {
  switch (variant) {
    case "destructive":
      return "border-red-500 bg-red-50 dark:bg-red-900/30";
    case "default":
    default:
      return "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50";
  }
};

const Alert = ({ className, variant, ...props }) => (
  <div className={cn("relative w-full rounded-lg border p-4", getVariantStyles(variant), className)} role="alert" {...props} />
);

Alert.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(["default", "destructive"]),
};

const AlertDescription = ({ className, ...props }) => <div className={cn("text-sm", className)} {...props} />;

AlertDescription.propTypes = {
  className: PropTypes.string,
};

export { Alert, AlertDescription };