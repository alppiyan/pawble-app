const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

export default function Button({ variant = 'primary', className = '', children, ...rest }) {
  return (
    <button className={`${variants[variant] || variants.primary} ${className}`} {...rest}>
      {children}
    </button>
  );
}
