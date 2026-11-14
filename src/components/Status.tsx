export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="notice notice--error" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="button button--secondary" type="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingNotice({ message }: { message: string }) {
  return <div className="notice" role="status"><p>{message}</p></div>;
}
