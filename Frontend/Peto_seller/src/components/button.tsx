import { Pets } from '@mui/icons-material';

type Props = {
  isloading?: boolean;
  Button_name?: string;
  Button_loading_name?: string;
  onClick?: () => void;
};

export default function button({ isloading = false, Button_name = 'Sign In to Console', Button_loading_name = 'Loading...', onClick }: Props) {
  return (
    <button
      type="submit"
      disabled={isloading}
      onClick={onClick}
      className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
    >
      {isloading ? (
        <>
          <span className="material-symbols-outlined animate-spin">
            <Pets />
          </span>{' '}
          {Button_loading_name}
        </>
      ) : (
        Button_name
      )}
    </button>
  );
}
