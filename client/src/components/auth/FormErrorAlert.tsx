interface FormErrorAlertProps {
    error: string | null;
}

export function FormErrorAlert({ error }: FormErrorAlertProps) {
    if (!error) return null;

    return (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
        </div>
    );
}
