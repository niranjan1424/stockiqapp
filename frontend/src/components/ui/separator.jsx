import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const Separator = ({ className, orientation = "horizontal", decorative = true, ...props }) => (
  <div
    role={decorative ? undefined : "separator"}
    aria-orientation={orientation}
    className={cn("shrink-0 bg-border", orientation === "vertical" ? "h-full w-px" : "h-px w-full", className)}
    {...props}
  />
);

Separator.propTypes = {
  className: PropTypes.string,
  orientation: PropTypes.oneOf(["horizontal", "vertical"]),
  decorative: PropTypes.bool,
};

export { Separator };