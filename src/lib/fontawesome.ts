import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faUserSecret as fasUserSecret } from '@fortawesome/free-solid-svg-icons' ////
import { faAddressBook as fasAddressBook } from '@fortawesome/free-solid-svg-icons' ////
import { faAddressBook as falAddressBook } from '@nethesis/nethesis-light-svg-icons' ////
import { faHouse as fasHouse } from '@fortawesome/free-solid-svg-icons'
import { faServer as fasServer } from '@fortawesome/free-solid-svg-icons'
import { faNetworkWired as fasNetworkWired } from '@fortawesome/free-solid-svg-icons'
import { faUserGroup as fasUserGroup } from '@fortawesome/free-solid-svg-icons'
import { faFire as fasFire } from '@fortawesome/free-solid-svg-icons' ////
import { faShieldHalved as fasShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { faGlobe as fasGlobe } from '@fortawesome/free-solid-svg-icons'
import { faList as fasList } from '@fortawesome/free-solid-svg-icons'
import { faChartLine as fasChartLine } from '@fortawesome/free-solid-svg-icons'
import { faMagnifyingGlass as fasMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { faLifeRing as fasLifeRing } from '@fortawesome/free-solid-svg-icons'
import { faBell as fasBell } from '@fortawesome/free-solid-svg-icons'
import { faMoon as fasMoon } from '@fortawesome/free-solid-svg-icons'
import { faCircleUser as fasCircleUser } from '@fortawesome/free-solid-svg-icons'
import { faChevronDown as fasChevronDown } from '@fortawesome/free-solid-svg-icons'
import { faChevronUp as fasChevronUp } from '@fortawesome/free-solid-svg-icons'
import { faXmark as fasXmark } from '@fortawesome/free-solid-svg-icons'
import { faGear as fasGear } from '@fortawesome/free-solid-svg-icons'
import { faBars as fasBars } from '@fortawesome/free-solid-svg-icons'
import { faTrash as fasTrash } from '@fortawesome/free-solid-svg-icons'

export async function loadFontAwesome(app: any) {
  app.component('font-awesome-icon', FontAwesomeIcon) ////
  library.add(fasUserSecret) ////
  library.add(fasAddressBook) ////
  library.add(falAddressBook) ////
  library.add(fasHouse)
  library.add(fasServer)
  library.add(fasNetworkWired)
  library.add(fasUserGroup)
  library.add(fasFire) //// change with block-brick-fire
  library.add(fasShieldHalved)
  library.add(fasGlobe)
  library.add(fasList)
  library.add(fasChartLine)
  library.add(fasMagnifyingGlass)
  library.add(fasLifeRing)
  library.add(fasBell)
  library.add(fasMoon)
  library.add(fasCircleUser)
  library.add(fasChevronDown)
  library.add(fasChevronUp)
  library.add(fasXmark)
  library.add(fasGear)
  library.add(fasBars)
  library.add(fasTrash)
}
