import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const Label = ({ className, ...props }) => <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />;

Label.propTypes = {
  className: PropTypes.string,
};

export { Label };