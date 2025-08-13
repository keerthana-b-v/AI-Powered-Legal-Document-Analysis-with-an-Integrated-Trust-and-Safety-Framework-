export const Alert = ({ children, className = "", variant = "default" }) => {
  const baseClasses = "relative w-full rounded-lg border p-4"
  const variantClasses = {
    default: "bg-background text-foreground",
    destructive: "border-red-500/50 text-red-600 bg-red-50",
    success: "border-green-500/50 text-green-600 bg-green-50",
    warning: "border-yellow-500/50 text-yellow-600 bg-yellow-50",
  }

  return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</div>
}

export const AlertDescription = ({ children, className = "" }) => {
  return <div className={`text-sm [&_p]:leading-relaxed ${className}`}>{children}</div>
}
