import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const Card = ({ className, ...props }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
);
Card.propTypes = { className: PropTypes.string };

const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);
CardHeader.propTypes = { className: PropTypes.string };

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
);
CardTitle.propTypes = { className: PropTypes.string };

const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
CardDescription.propTypes = { className: PropTypes.string };

const CardContent = ({ className, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.propTypes = { className: PropTypes.string };

const CardFooter = ({ className, ...props }) => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
CardFooter.propTypes = { className: PropTypes.string };

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
