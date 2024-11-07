//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowCircleDown,
  faArrowDown,
  faArrowUp,
  faArrowCircleUp,
  faArrowRight,
  faArrowRotateLeft,
  faArrowsLeftRight as fasArrowsLeftRight,
  faArrowsRotate,
  faArrowUpRightFromSquare,
  faBan as fasBan,
  faBars as fasBars,
  faBolt as fasBolt,
  faBoxArchive,
  faChartLine as fasChartLine,
  faCheck as fasCheck,
  faChevronDown as fasChevronDown,
  faChevronUp as fasChevronUp,
  faCircleArrowDown,
  faCircleArrowUp,
  faCircleCheck as fasCircleCheck,
  faCircleChevronDown,
  faCircleChevronUp,
  faCircleInfo as fasCircleInfo,
  faCircleMinus as fasCircleMinus,
  faCirclePlus as fasCirclePlus,
  faCircleQuestion as fasCircleQuestion,
  faCircleStop,
  faCircleUser as fasCircleUser,
  faCircleXmark as fasCircleXmark,
  faClock as faClock,
  faClockRotateLeft as faClockRotateLeft,
  faClone as faClone,
  faCopy as fasCopy,
  faDiagramProject as fasDiagramProject,
  faDownLeftAndUpRightToCenter,
  faEarthAmericas as fasEarthAmericas,
  faEllipsisVertical as fasEllipsisVertical,
  faFloppyDisk as fasFloppyDisk,
  faGear as fasGear,
  faGlobe as fasGlobe,
  faHardDrive,
  faHouse as fasHouse,
  faKey,
  faLayerGroup as faLayerGroup,
  faList as fasList,
  faLocationDot as fasLocationDot,
  faLock as faLock,
  faMagnifyingGlass as fasMagnifyingGlass,
  faMagnifyingGlassPlus as fasMagnifyingGlassPlus,
  faMoon as fasMoon,
  faNetworkWired as fasNetworkWired,
  faPenToSquare as fasPenToSquare,
  faPlay,
  faPlus as fasPlus,
  faPowerOff,
  faRotate,
  faScaleBalanced as faScaleBalanced,
  faServer as fasServer,
  faShapes as fasShapes,
  faShield as fasShield,
  faShieldHalved as fasShieldHalved,
  faStar as fasStar,
  faSun as fasSun,
  faTrash as fasTrash,
  faCrown as fasCrown,
  faUnlock as fasUnlock,
  faUpRightAndDownLeftFromCenter,
  faUserGear,
  faUserGroup as fasUserGroup,
  faUsers as fasUsers,
  faWarning as faWarning,
  faWifi,
  faWrench as fasWrench,
  faXmark as fasXmark,
  faBell as fasBell,
  faDatabase,
  faRightFromBracket as fasRightFromBracket,
  faTriangleExclamation,
  faChartSimple,
  faEraser as fasEraser,
  faAward,
  faLink,
  faLinkSlash,
  faTerminal as fasTerminal,
  faTable
} from '@fortawesome/free-solid-svg-icons'
import {
  faBlockBrickFire as falBlockBrickFire,
  faChartLine as falChartLine,
  faGlobe as falGlobe,
  faHouse as falHouse,
  faList as falList,
  faNetworkWired as falNetworkWired,
  faServer as falServer,
  faShieldHalved as falShieldHalved,
  faUserGroup as falUserGroup,
  faGear as falGear
} from '@nethesis/nethesis-light-svg-icons'
import {
  faBlockBrickFire as fasBlockBrickFire,
  faTrafficCone as fasTrafficCone
} from '@nethesis/nethesis-solid-svg-icons'
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
} from '@fortawesome/free-brands-svg-icons'
import { faNetflix, faNordVpn, faSquareXTwitter } from '@nethesis/nethesis-brands-svg-icons'
import { faBell as farBell } from '@fortawesome/free-regular-svg-icons'

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
  library.add(fasCircleUser)
  library.add(fasChevronDown)
  library.add(fasChevronUp)
  library.add(fasXmark)
  library.add(fasGear)
  library.add(falGear)
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
  library.add(faClockRotateLeft)
  library.add(faLock)
  library.add(faArrowDown)
  library.add(faArrowUp)
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
  library.add(faArrowCircleDown)
  library.add(faArrowCircleUp)
  library.add(faArrowUpRightFromSquare)
  library.add(faArrowRotateLeft)
  library.add(faBoxArchive)
  library.add(faPlay)
  library.add(faRotate)
  library.add(faCircleArrowDown)
  library.add(faCircleArrowUp)
  library.add(fasShapes)
  library.add(fasDiagramProject)
  library.add(fasArrowsLeftRight)
  library.add(faFacebook)
  library.add(faAmazon)
  library.add(faWhatsapp)
  library.add(faInstagram)
  library.add(faNetflix)
  library.add(faSquareXTwitter)
  library.add(faTelegram)
  library.add(faTiktok)
  library.add(faYoutube)
  library.add(faFacebookMessenger)
  library.add(faVimeo)
  library.add(faSnapchat)
  library.add(faPinterest)
  library.add(faNordVpn)
  library.add(faTwitch)
  library.add(fasTrafficCone)
  library.add(fasStar)
  library.add(faKey)
  library.add(fasBell)
  library.add(farBell)
  library.add(faDatabase)
  library.add(fasRightFromBracket)
  library.add(faTriangleExclamation)
  library.add(faChartSimple)
  library.add(fasMagnifyingGlassPlus)
  library.add(fasEraser)
  library.add(faAward)
  library.add(faLink)
  library.add(faLinkSlash)
  library.add(fasTerminal)
  library.add(faTable)
  library.add(fasCrown)
}
