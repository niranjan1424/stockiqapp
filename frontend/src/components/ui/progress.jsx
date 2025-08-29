import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const Progress = ({ className, value, ...props }) => (
  <div className={cn("relative w-full overflow-hidden rounded-full bg-secondary", className)} {...props}>
    <div className="h-2 bg-primary transition-all" style={{ width: `${value}%` }} />
  </div>
);

Progress.propTypes = {
  className: PropTypes.string,
  value: PropTypes.number,
};

export { Progress };