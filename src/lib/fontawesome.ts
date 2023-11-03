import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowRight,
  faArrowsRotate,
  faPowerOff,
  faCircleStop,
  faHouse as fasHouse,
  faUserGear,
  faWifi,
  faArrowUpRightFromSquare,
  faDiagramProject as fasDiagramProject,
  faArrowsLeftRight as fasArrowsLeftRight
} from '@fortawesome/free-solid-svg-icons'
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
import { faCopy as fasCopy } from '@fortawesome/free-solid-svg-icons'
import { faUnlock as fasUnlock } from '@fortawesome/free-solid-svg-icons'
import { faUsers as fasUsers } from '@fortawesome/free-solid-svg-icons'
import { faScaleBalanced as faScaleBalanced } from '@fortawesome/free-solid-svg-icons'
import { faClock as faClock } from '@fortawesome/free-solid-svg-icons'
import { faLayerGroup as faLayerGroup } from '@fortawesome/free-solid-svg-icons'
import { faLock as faLock } from '@fortawesome/free-solid-svg-icons'
import { faWarning as faWarning } from '@fortawesome/free-solid-svg-icons'
import { faWrench as fasWrench } from '@fortawesome/free-solid-svg-icons'
import { faCheck as fasCheck } from '@fortawesome/free-solid-svg-icons'
import { faBolt as fasBolt } from '@fortawesome/free-solid-svg-icons'
import { faBan as fasBan } from '@fortawesome/free-solid-svg-icons'
import { faShield as fasShield } from '@fortawesome/free-solid-svg-icons'
import { faCircleInfo as fasCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { faEmptySet } from '@nethesis/nethesis-solid-svg-icons'
import { faClone as faClone } from '@fortawesome/free-solid-svg-icons'
import { faHardDrive } from '@fortawesome/free-solid-svg-icons/faHardDrive'
import { faCircleChevronDown } from '@fortawesome/free-solid-svg-icons/faCircleChevronDown'
import { faCircleChevronUp } from '@fortawesome/free-solid-svg-icons/faCircleChevronUp'
import { faDownLeftAndUpRightToCenter } from '@fortawesome/free-solid-svg-icons/faDownLeftAndUpRightToCenter'
import { faUpRightAndDownLeftFromCenter } from '@fortawesome/free-solid-svg-icons/faUpRightAndDownLeftFromCenter'
import { faCircleArrowDown } from '@fortawesome/free-solid-svg-icons/faCircleArrowDown'
import { faCircleArrowUp } from '@fortawesome/free-solid-svg-icons/faCircleArrowUp'
import { faShapes as fasShapes } from '@fortawesome/free-solid-svg-icons'
import { faTrafficCone as fasTrafficCone } from '@nethesis/nethesis-solid-svg-icons'
import { faStar as fasStar } from '@fortawesome/free-solid-svg-icons'

import {
  faAmazon,
  faFacebook,
  faFacebookMessenger,
  faInstagram,
  faPinterest,
  faSnapchat,
  faTelegram,
  faTiktok,
  faTwitch,
  faVimeo,
  faWhatsapp,
  faYoutube
} from '@nethesis/nethesis-brands-svg-icons'

export async function loadFontAwesome(app: any) {
  app.component('FontAwesomeIcon', FontAwesomeIcon)
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
  library.add(fasCopy)
  library.add(fasUnlock)
  library.add(fasUsers)
  library.add(faScaleBalanced)
  library.add(faClock)
  library.add(faLock)
  library.add(faLayerGroup)
  library.add(faWarning)
  library.add(fasWrench)
  library.add(fasCheck)
  library.add(fasBolt)
  library.add(fasBan)
  library.add(fasShield)
  library.add(faPowerOff)
  library.add(faArrowsRotate)
  library.add(fasCircleInfo)
  library.add(faArrowRight)
  library.add(faEmptySet)
  library.add(faClone)
  library.add(faUserGear)
  library.add(faCircleStop)
  library.add(faWifi)
  library.add(faArrowUpRightFromSquare)
  library.add(faHardDrive)
  library.add(faCircleChevronDown)
  library.add(faCircleChevronUp)
  library.add(faDownLeftAndUpRightToCenter)
  library.add(faUpRightAndDownLeftFromCenter)
  library.add(faCircleArrowDown)
  library.add(faCircleArrowUp)
  library.add(fasShapes)
  library.add(fasDiagramProject)
  library.add(fasArrowsLeftRight)
  library.add(faFacebook)
  library.add(faAmazon)
  library.add(faWhatsapp)
  library.add(faInstagram)
  // library.add(faNetflix) ////
  // library.add(faXTwitter) ////
  library.add(faTelegram)
  library.add(faTiktok)
  library.add(faYoutube)
  library.add(faFacebookMessenger)
  library.add(faVimeo)
  library.add(faSnapchat)
  library.add(faPinterest)
  // library.add(faNordVpn) ////
  library.add(faTwitch)
  library.add(fasTrafficCone)
  library.add(fasStar)
}
