import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const Skeleton = ({ className, ...props }) => <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;

Skeleton.propTypes = {
  className: PropTypes.string,
};

export { Skeleton };