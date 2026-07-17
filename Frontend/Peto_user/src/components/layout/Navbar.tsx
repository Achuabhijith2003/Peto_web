import Logo from "../common/Logo";

const Navbar = () => {
  return (
    <header className="border-b bg-white">
      <div className="container flex h-20 items-center justify-between">
        <Logo />

        <nav className="flex gap-8">
          <a href="#">Products</a>
          <a href="#">Services</a>
          <a href="#">About</a>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;