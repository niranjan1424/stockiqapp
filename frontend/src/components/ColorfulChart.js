import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ColorfulChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          type="category"
          domain={['auto', 'auto']}
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleString()}
          formatter={(value) => `$${value}`}
        />
        <Line type="monotone" dataKey="close" stroke="#8884d8" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ColorfulChart;