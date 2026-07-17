import Button from "../common/Button";

const GoogleButton = () => {
  return (
    <Button
      variant="secondary"
      className="flex items-center justify-center gap-3"
    >
      <img
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google"
        className="h-5 w-5"
      />

      Continue with Google
    </Button>
  );
};

export default GoogleButton;