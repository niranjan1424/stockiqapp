import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const MetricCard = ({ title, value, Icon, valueClassName = '' }) => {
    return (
        <Card className="bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
                {Icon && <Icon className="h-5 w-5 text-gray-400" />}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClassName}`}>
                    {value}
                </div>
            </CardContent>
        </Card>
    );
};

MetricCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    Icon: PropTypes.elementType,
    valueClassName: PropTypes.string,
};

export default MetricCard;