export { Navbar } from './Navbar'
export { NavbarBrand } from './NavbarBrand'
export { NavbarLinks, NAV_ITEMS } from './NavbarLinks'
export { NavbarActions } from './NavbarActions'
export { NavbarMobileMenu } from './NavbarMobileMenu'
export { NavbarMenuToggleSection } from './NavbarMenuToggleSection'

// Re-export HeroUI primitive components for custom navbar implementations (wrapped for type safety)
export {
  HeroUINavbar,
  NavbarBrand as NavbarBrandPrimitive,
  NavbarContent,
  NavbarItem
} from './NavbarPrimitives'
