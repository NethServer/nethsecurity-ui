import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faHouse as fasHouse } from '@fortawesome/free-solid-svg-icons'
import { faHouse as falHouse } from '@nethesis/nethesis-light-svg-icons'
import { faServer as fasServer } from '@fortawesome/free-solid-svg-icons'
import { faServer as falServer } from '@nethesis/nethesis-light-svg-icons'
import { faNetworkWired as fasNetworkWired } from '@fortawesome/free-solid-svg-icons'
import { faNetworkWired as falNetworkWired } from '@nethesis/nethesis-light-svg-icons'
import { faUserGroup as fasUserGroup } from '@fortawesome/free-solid-svg-icons'
import { faUserGroup as falUserGroup } from '@nethesis/nethesis-light-svg-icons'
import { faBlockBrickFire as fasBlockBrickFire } from '@nethesis/nethesis-solid-svg-icons'
import { faBlockBrickFire as falBlockBrickFire } from '@nethesis/nethesis-light-svg-icons'
import { faShieldHalved as fasShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { faShieldHalved as falShieldHalved } from '@nethesis/nethesis-light-svg-icons'
import { faGlobe as fasGlobe } from '@fortawesome/free-solid-svg-icons'
import { faGlobe as falGlobe } from '@nethesis/nethesis-light-svg-icons'
import { faList as fasList } from '@fortawesome/free-solid-svg-icons'
import { faList as falList } from '@nethesis/nethesis-light-svg-icons'
import { faChartLine as fasChartLine } from '@fortawesome/free-solid-svg-icons'
import { faChartLine as falChartLine } from '@nethesis/nethesis-light-svg-icons'
import { faMagnifyingGlass as fasMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { faCircleQuestion as fasCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import { faBell as fasBell } from '@fortawesome/free-solid-svg-icons'
import { faMoon as fasMoon } from '@fortawesome/free-solid-svg-icons'
import { faSun as fasSun } from '@fortawesome/free-solid-svg-icons'
import { faCircleHalfStroke as fasCircleHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { faCircleUser as fasCircleUser } from '@fortawesome/free-solid-svg-icons'
import { faChevronDown as fasChevronDown } from '@fortawesome/free-solid-svg-icons'
import { faChevronUp as fasChevronUp } from '@fortawesome/free-solid-svg-icons'
import { faXmark as fasXmark } from '@fortawesome/free-solid-svg-icons'
import { faGear as fasGear } from '@fortawesome/free-solid-svg-icons'
import { faBars as fasBars } from '@fortawesome/free-solid-svg-icons'
import { faTrash as fasTrash } from '@fortawesome/free-solid-svg-icons'
import { faFloppyDisk as fasFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import { faPlus as fasPlus } from '@fortawesome/free-solid-svg-icons'
import { faPenToSquare as fasPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { faCirclePlus as fasCirclePlus } from '@fortawesome/free-solid-svg-icons'
import { faCircleMinus as fasCircleMinus } from '@fortawesome/free-solid-svg-icons'
import { faCircleXmark as fasCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { faCircleCheck as fasCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { faLocationDot as fasLocationDot } from '@fortawesome/free-solid-svg-icons'
import { faEarthAmericas as fasEarthAmericas } from '@fortawesome/free-solid-svg-icons'
import { faEllipsisVertical as fasEllipsisVertical } from '@fortawesome/free-solid-svg-icons'

export async function loadFontAwesome(app: any) {
  app.component('font-awesome-icon', FontAwesomeIcon) ////
  library.add(fasHouse)
  library.add(falHouse)
  library.add(fasServer)
  library.add(falServer)
  library.add(fasNetworkWired)
  library.add(falNetworkWired)
  library.add(fasUserGroup)
  library.add(falUserGroup)
  library.add(fasBlockBrickFire)
  library.add(falBlockBrickFire)
  library.add(fasShieldHalved)
  library.add(falShieldHalved)
  library.add(fasGlobe)
  library.add(falGlobe)
  library.add(fasList)
  library.add(falList)
  library.add(fasChartLine)
  library.add(falChartLine)
  library.add(fasMagnifyingGlass)
  library.add(fasCircleQuestion)
  library.add(fasBell)
  library.add(fasMoon)
  library.add(fasSun)
  library.add(fasCircleHalfStroke)
  library.add(fasCircleUser)
  library.add(fasChevronDown)
  library.add(fasChevronUp)
  library.add(fasXmark)
  library.add(fasGear)
  library.add(fasBars)
  library.add(fasTrash)
  library.add(fasFloppyDisk)
  library.add(fasPlus)
  library.add(fasPenToSquare)
  library.add(fasCirclePlus)
  library.add(fasCircleMinus)
  library.add(fasCircleXmark)
  library.add(fasCircleCheck)
  library.add(fasLocationDot)
  library.add(fasEarthAmericas)
  library.add(fasEllipsisVertical)
}
